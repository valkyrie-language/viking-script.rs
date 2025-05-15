use crate::error::{ParseError, ParseErrorKind, ParseResult, IndentErrorKind};
use crate::grammar::{GrammarInfo, PrattOperator, PrattOperatorType, Associativity, PrattRuleConfig, GrammarConfig};
use crate::input::{InputOffset, InputStream};
use crate::instruction::{Instruction, RuleId, TagId};
use crate::tree::{GreenNode, NodePool};
use std::collections::{HashMap, VecDeque};
use std::rc::Rc; // For sharing grammar info

// Result of parsing a single step/instruction
// (new_offset, Option<GreenNode index>, Option<TagId if one was applied to this node>)
type StepParseResult = ParseResult<(InputOffset, Option<GreenNode>, Option<TagId>)>;

pub type CustomParser =
Box<dyn Fn(&mut ParserState, InputOffset) -> ParseResult<(InputOffset, GreenNode)>>;


// Memoization table key: (RuleId, InputOffset)
// Memoization table value: Result<(OutputOffset, Option<GreenNode>, Option<TagId>), ParseError_at_that_point>
// The error needs to be cloneable if stored.
type MemoKey = (RuleId, InputOffset);
type MemoEntry = Result<(InputOffset, Option<GreenNode>, Option<TagId>), Rc<ParseError>>;


pub struct ParserState<'g, 'i, I: InputStream + ?Sized> {
    pub grammar_info: &'g GrammarInfo,
    pub input: &'i I,
    pub node_pool: NodePool, // Each parser run gets its own pool for now. Could be shared/reset.
    pub memo_table: HashMap<MemoKey, MemoEntry>,
    pub recovered_errors: Vec<ParseError>, // Errors collected via Trap instructions

    // Indentation state
    // A stack of indentation levels. Current level is the top.
    // Indent pushes, Dedent pops (if matched).
    indentation_stack: Vec<u32>,
    current_indentation: u32, // Cache of indentation_stack.last() or 0 if empty.

    // Pratt parsing specific state
    // pratt_operator_stack: Vec<...>,
    // pratt_operand_stack: Vec<GreenNode>,

    // For Pinning: if true, current Choice must commit to first success of a Pinned alternative
    is_pinned_choice_active: bool,
    pin_committed: bool, // If a pinned rule inside a choice has successfully matched

    // Language ID for nodes created by this parser instance
    pub language_id: u32,
}

impl<'g, 'i, I: InputStream + ?Sized> ParserState<'g, 'i, I> {
    pub fn new(grammar_info: &'g GrammarInfo, input: &'i I, language_id: u32) -> Self {
        let initial_indent = 0; // Or derive from input's first line if relevant
        Self {
            grammar_info,
            input,
            node_pool: NodePool::new(),
            memo_table: HashMap::new(),
            recovered_errors: Vec::new(),
            indentation_stack: vec![initial_indent], // Start with base indentation
            current_indentation: initial_indent,
            is_pinned_choice_active: false,
            pin_committed: false,
            language_id,
        }
    }

    pub fn parse_root(&mut self, root_rule_id: RuleId) -> ParseResult<(Option<GreenNode>, Vec<ParseError>)> {
        match self.eval_instruction(&self.grammar_info.instructions_map[&root_rule_id], 0) {
            Ok((_offset, green_node_opt, _tag_id)) => Ok((green_node_opt, self.recovered_errors.clone())),
            Err(e) => {
                let mut all_errors = self.recovered_errors.clone();
                all_errors.push(e);
                Err(all_errors.remove(0)) // Return the primary error
            }
        }
    }

    // Main dispatch function
    fn eval_instruction(&mut self, instr: &Instruction, at: InputOffset) -> StepParseResult {
        // Basic memoization check (can be made more sophisticated for incremental parsing)
        // For rules, memoization is more common. For raw instructions, it depends.
        // Let's assume memoization is primarily for `Instruction::Rule`.

        // Reset pin_committed for non-choice or start of choice
        if !matches!(instr, Instruction::Choice {..} | Instruction::Pinned {..}) {
            self.pin_committed = false;
        }

        match instr {
            Instruction::Rule { id } => self.eval_rule(*id, at),
            Instruction::External { custom_id } => self.eval_external(*custom_id, at),
            Instruction::Literal { text } => self.eval_literal(text, at),
            Instruction::Regex { regex } => self.eval_regex(regex, at),
            Instruction::Variable { name } => self.eval_variable(name, at),
            Instruction::Sequence { rules } => self.eval_sequence(rules, at),
            Instruction::Choice { rules } => self.eval_choice(rules, at),
            Instruction::Repeats { rule, min, max } => self.eval_repeats(rule, *min, *max, at),
            Instruction::Lookahead { rule, negative } => self.eval_lookahead(rule, *negative, at),
            Instruction::Tagged { id, rule } => self.eval_tagged(*id, rule, at),
            Instruction::Trap { id, rule } => self.eval_trap(*id, rule, at),
            Instruction::Whitespace => self.eval_whitespace(at),
            Instruction::Newline => self.eval_newline(at),
            Instruction::Ignored => self.eval_ignored(at),
            Instruction::Indent => self.eval_indent(at),
            Instruction::Dedent => self.eval_dedent(at),
            Instruction::EndOfFile => self.eval_eof(at),
            Instruction::PrattExpression { rule_id } => self.eval_pratt_expression(*rule_id, at),
            Instruction::Pinned { rule } => self.eval_pinned(rule, at),
        }
    }

    fn eval_rule(&mut self, rule_id: RuleId, at: InputOffset) -> StepParseResult {
        let memo_key = (rule_id, at);
        if let Some(entry) = self.memo_table.get(&memo_key) {
            return entry.clone().map_err(|rc_err| (*rc_err).clone());
        }

        // Check if this rule_id corresponds to a Pratt rule configuration
        if self.grammar_info.pratt_configs.contains_key(&rule_id) {
            // Delegate to Pratt parsing logic if it's a top-level Pratt rule invocation
            let result = self.parse_pratt_expr_entry(rule_id, at);
            self.memo_table.insert(memo_key, result.clone().map_err(Rc::new));
            return result;
        }

        // Standard rule lookup
        let result = match self.grammar_info.instructions_map.get(&rule_id) {
            Some(instr_body) => {
                // To avoid infinite recursion with Rc<Instruction> or deep clones,
                // we might need a way to "borrow" the instruction or use indices.
                // For now, assuming instructions are simple enough to clone or live long enough.
                // This clone is problematic if Instruction contains large Regexes.
                // A better way: parser holds Rc<GrammarInfo> and instructions are borrowed.
                // Given GrammarInfo is &'g, instructions are also effectively borrowed.
                // The issue is if eval_instruction takes `instr: &Instruction`.
                let cloned_instr_body = instr_body.clone(); // Avoid if possible, this is for demo
                self.eval_instruction(&cloned_instr_body, at) // Recursive call
            }
            None => Err(ParseError::new(ParseErrorKind::RuleMismatch { rule_id, at })), // Should not happen if grammar compiled correctly
        };
        self.memo_table.insert(memo_key, result.clone().map_err(Rc::new));
        result
    }

    fn eval_literal(&mut self, text: &str, at: InputOffset) -> StepParseResult {
        if let Some(next_offset) = self.input.match_str(text, at) {
            // Literals usually form part of a larger structure.
            // Individual literal matches might not create their own GreenNode unless specified (e.g. by a Tagged instruction).
            // For now, let's say successful literal match returns its length, but no node.
            // The parent (Sequence, Choice, Tagged) will create the node.
            Ok((next_offset, None, None))
        } else {
            let found_text = self.input.view(at..std::cmp::min(at + text.len() as u64, self.input.len_bytes()));
            Err(ParseError::literal_mismatch(text.to_string(), found_text.into_owned(), at))
        }
    }

    fn eval_regex(&mut self, regex: &FancyRegex, at: InputOffset) -> StepParseResult {
        // `fancy_regex` works on strings. We need to get a view of the input.
        // This is inefficient for large inputs if we create large string slices often.
        // For now, take a reasonably sized slice or the rest of the input.
        // A better integration would allow regex to work on the InputStream directly if possible,
        // or use a stream-friendly regex engine.
        let remaining_input_view = self.input.view(at..self.input.len_bytes());
        match regex.find(&remaining_input_view) {
            // We need to ensure the match is at the beginning of the slice (like ^)
            Ok(Some(mat)) if mat.start() == 0 => {
                let matched_text_len = mat.end() - mat.start();
                Ok((at + matched_text_len as u64, None, None))
            }
            _ => Err(ParseError::regex_mismatch(regex.as_str().to_string(), at)),
        }
    }

    fn eval_sequence(&mut self, rules: &[Instruction], mut current_at: InputOffset) -> StepParseResult {
        let mut children_nodes = Vec::new();
        let start_at = current_at;
        let mut overall_tag: Option<TagId> = None;

        for (idx, rule_instr) in rules.iter().enumerate() {
            match self.eval_instruction(rule_instr, current_at) {
                Ok((next_offset, child_node_opt, child_tag_id)) => {
                    current_at = next_offset;
                    if let Some(child_node) = child_node_opt {
                        children_nodes.push(child_node);
                    }
                    if idx == 0 { // Simplistic: take tag from first element if any
                        overall_tag = child_tag_id;
                    }
                }
                Err(e) => return Err(e),
            }
        }
        // If a sequence matches, it often forms a node.
        // The 'kind' of this node would ideally be the RuleId of the rule that defined this sequence.
        // This requires passing down the current rule_id context.
        // For now, a generic sequence node or defer node creation to Tagged.
        // Let's assume sequences themselves don't create nodes unless wrapped in Tagged or Rule.
        // If children_nodes exist, we *should* make a parent.
        // This part needs clarification on how GreenNodes are formed by non-tagged sequences.
        // Let's say: if a sequence is part of a Rule::RuleRef, the RuleRef's eval_rule handles node creation.
        // If it's an anonymous sequence, it might only create a node if it has children
        // AND it's directly under a Tagged or Rule.
        // For now, pass up children and let the caller decide.
        // However, the result expects Option<GreenNode>. If children_nodes is not empty,
        // we should probably create an "anonymous sequence" node.
        // This needs a "kind" for such nodes.

        // For simplicity, let's say a sequence itself doesn't make a node,
        // but its children are collected. The `Rule` instruction or `Tagged` will make the parent.
        // This means if `children_nodes` is not empty, this `StepParseResult`'s GreenNode should be an aggregrate.
        // This interpretation is complicated. A common approach: Sequence results in one node if it's from a rule.
        // Let's return NO node for a raw sequence. Tagged/Rule will create it.
        Ok((current_at, None, overall_tag)) // No node from raw sequence, just consumed length
    }

    fn eval_choice(&mut self, rules: &[Instruction], at: InputOffset) -> StepParseResult {
        let old_is_pinned_active = self.is_pinned_choice_active;
        self.is_pinned_choice_active = true; // Signal that Pinned inside this choice can commit
        self.pin_committed = false; // Reset commit state for this choice

        let mut furthest_error: Option<ParseError> = None;
        for rule_instr in rules {
            match self.eval_instruction(rule_instr, at) {
                Ok(res) => {
                    self.is_pinned_choice_active = old_is_pinned_active; // Restore state
                    return Ok(res);
                }
                Err(e) => {
                    // Track the error that occurred furthest into the input, or the first one.
                    // A more sophisticated error reporting might prefer errors from longer matches.
                    if furthest_error.is_none() { // || e.at > furthest_error.as_ref().unwrap().at (need at on ParseError)
                        furthest_error = Some(e);
                    }
                    if self.pin_committed { // If a Pinned alternative failed, stop trying others
                        self.is_pinned_choice_active = old_is_pinned_active;
                        // The error from the pinned rule is the one to return
                        return Err(furthest_error.unwrap_or_else(|| ParseError::choice_failure(at)));
                    }
                }
            }
        }
        self.is_pinned_choice_active = old_is_pinned_active;
        Err(furthest_error.unwrap_or_else(|| ParseError::choice_failure(at)))
    }

    fn eval_repeats(&mut self, rule: &Instruction, min: u32, max: u32, mut current_at: InputOffset) -> StepParseResult {
        let mut children_nodes = Vec::new();
        let mut count = 0;
        let start_at = current_at;

        loop {
            if count >= max && max != u32::MAX { // max=u32::MAX (originally 0 from Rule::Repeats) means unbounded
                break;
            }
            // Try to parse one instance of the rule
            match self.eval_instruction(rule, current_at) {
                Ok((next_offset, child_node_opt, _child_tag_id)) => {
                    if next_offset == current_at && count > 0 { // Rule matched but consumed no input (potential infinite loop)
                        // This is a common issue in PEGs. If it's e.g. `a*` and `a` matches empty.
                        // For now, we break. Some parsers disallow empty matches in `*` or `+`.
                        // If min is not met, this will fail. Otherwise, it's fine.
                        break;
                    }
                    current_at = next_offset;
                    if let Some(child_node) = child_node_opt {
                        children_nodes.push(child_node);
                    }
                    count += 1;
                }
                Err(_e) => {
                    // Failed to match another repetition, this is fine if min is met.
                    break;
                }
            }
        }

        if count >= min {
            // Similar to Sequence, Repeats itself might not form a node unless Tagged or part of a Rule.
            // If children_nodes exist, they are passed up.
            // Let's assume Repeats, like Sequence, doesn't create a node directly.
            Ok((current_at, None, None))
        } else {
            Err(ParseError::new(ParseErrorKind::MinRepetitionNotMet { at: start_at }))
        }
    }

    fn eval_lookahead(&mut self, rule: &Instruction, negative: bool, at: InputOffset) -> StepParseResult {
        match self.eval_instruction(rule, at) {
            Ok(_) => { // Matched
                if negative { // Negative lookahead, but it matched: Error
                    Err(ParseError::new(ParseErrorKind::NegativeLookaheadFailed { at }))
                } else { // Positive lookahead, it matched: Success, consume no input
                    Ok((at, None, None))
                }
            }
            Err(_) => { // Did not match
                if negative { // Negative lookahead, it didn't match: Success, consume no input
                    Ok((at, None, None))
                } else { // Positive lookahead, it didn't match: Error
                    Err(ParseError::new(ParseErrorKind::PositiveLookaheadFailed { at }))
                }
            }
        }
    }

    fn eval_tagged(&mut self, tag_id: TagId, rule: &Instruction, at: InputOffset) -> StepParseResult {
        match self.eval_instruction(rule, at) {
            Ok((next_offset, mut child_node_opt, _child_tag_id)) => {
                // If the inner rule produced a node, we might re-tag it or use it.
                // If inner rule did NOT produce a node (e.g. it was a literal),
                // the Tagged instruction is responsible for creating one.

                // What is the 'kind' of a tagged node?
                // It's usually the kind of the rule it's tagging.
                // This implies Tagged should wrap a Rule::RuleRef or similar structure that has a kind.
                // For now, let's use a generic "TaggedNode" kind or 0. This needs more thought.
                // Let's assume the `kind` comes from the rule that the `Tagged` instruction itself belongs to.
                // This means `eval_rule` should pass its `rule_id` down for node creation.

                // Simple approach: If child_node_opt is None, create a new leaf node for the matched span.
                // If child_node_opt is Some, this tag applies to that node.
                // The prompt: "tag only on atomic token or 1st level choice".
                // And "mark = hash(language, kind, tag)". GreenData has kind and tag.

                // If the inner rule created a node, we just pass that node along with the new tag.
                // The tag_id is associated with the node for the consumer of the tree.
                // The GreenNode itself will store this tag_id if created here.

                // Let's create a new node if the span is non-empty, regardless of child.
                // This simplifies things: Tagged *always* tries to make a node.
                let length = (next_offset - at) as u32;
                if length > 0 || child_node_opt.is_some() { // Create node if it has length or children
                    // The `kind` of the node created by `Tagged` is an open question.
                    // If `rule` is `Rule { id: X }`, then kind is `X`.
                    // If `rule` is `Literal`, kind could be a special "LiteralToken" kind.
                    // For now, let's use a placeholder kind (e.g. 0 or a specific "TaggedFragment").
                    // The rule that *contains* this Tagged instruction should define the kind.
                    // So, `Tagged` passes its tag_id, and the node creator (e.g. `eval_rule`) uses it.
                    // This `StepParseResult` returns the tag_id to its caller.
                    Ok((next_offset, child_node_opt, Some(tag_id)))
                } else {
                    // Matched empty, no node, but tag might still be relevant if caller cares.
                    Ok((next_offset, None, Some(tag_id)))
                }
            }
            Err(e) => Err(e),
        }
    }

    fn eval_eof(&self, at: InputOffset) -> StepParseResult {
        if self.input.match_eof(at) {
            Ok((at, None, None))
        } else {
            Err(ParseError::new(ParseErrorKind::EndOfFileExpected { at }))
        }
    }

    // --- Special Rules (Whitespace, Newline, Ignored, Indent, Dedent) ---
    // These might be user-defined via named rules in GrammarConfig or have default behaviors.
    fn get_special_rule_instr(&self, rule_name_opt: Option<&String>) -> Option<&Instruction> {
        rule_name_opt
            .and_then(|name| self.grammar_info.rule_name_to_id.get(name))
            .and_then(|id| self.grammar_info.instructions_map.get(id))
    }

    fn eval_whitespace(&mut self, at: InputOffset) -> StepParseResult {
        if let Some(instr) = self.get_special_rule_instr(self.grammar_info.config.default_whitespace_rule_name.as_ref()) {
            // Need to clone instr to pass to eval_instruction to avoid borrowing issues
            // This highlights a need for better instruction dispatch without cloning potentially large Instructions.
            // For now, this is a simplification. In a real system, instructions would be Rc or accessed by ID.
            let cloned_instr = instr.clone();
            self.eval_instruction(&cloned_instr, at)
        } else {
            // Default: match one or more spaces/tabs
            let initial_at = at;
            let mut current_at = at;
            loop {
                match self.input.char_at(current_at) {
                    Some(' ') | Some('\t') => {
                        current_at += 1; // Assuming 1 byte per space/tab for simplicity
                    }
                    _ => break,
                }
            }
            if current_at > initial_at {
                Ok((current_at, None, None))
            } else {
                Err(ParseError::generic("Expected whitespace".to_string(), at)) // Or a specific error
            }
        }
    }

    fn eval_newline(&mut self, at: InputOffset) -> StepParseResult {
        if let Some(instr) = self.get_special_rule_instr(self.grammar_info.config.default_newline_rule_name.as_ref()) {
            let cloned_instr = instr.clone();
            self.eval_instruction(&cloned_instr, at)
        } else {
            // Default: match \n or \r\n
            if let Some(offset) = self.input.match_str("\r\n", at) {
                return Ok((offset, None, None));
            }
            if let Some(offset) = self.input.match_char('\n', at) {
                return Ok((offset, None, None));
            }
            Err(ParseError::generic("Expected newline".to_string(), at))
        }
    }

    fn eval_ignored(&mut self, mut at: InputOffset) -> StepParseResult {
        // `Ignored` is typically `(Whitespace | Newline | Comment)*`
        // This default is simplified. A proper `Ignored` would be a Choice/Repeats.
        // If user defines "IGNORED" rule, that is used.
        if let Some(instr) = self.get_special_rule_instr(self.grammar_info.config.default_ignored_rule_name.as_ref()) {
            let cloned_instr = instr.clone();
            return self.eval_instruction(&cloned_instr, at);
        }

        // Simplified default: consume (whitespace | newline)*
        let start_at = at;
        loop {
            let mut progressed = false;
            if let Ok((next_at, _, _)) = self.eval_whitespace(at) {
                if next_at > at {
                    at = next_at;
                    progressed = true;
                }
            }
            if let Ok((next_at, _, _)) = self.eval_newline(at) {
                if next_at > at {
                    at = next_at;
                    progressed = true;
                }
            }
            if !progressed {
                break;
            }
        }
        Ok((at, None, None)) // Ignored always succeeds, consumes what it can
    }

    fn eval_indent(&mut self, at: InputOffset) -> StepParseResult {
        let new_indent = self.input.indentation(at, &self.grammar_info.config);
        if new_indent > self.current_indentation {
            self.indentation_stack.push(new_indent);
            self.current_indentation = new_indent;
            Ok((at, None, None)) // Indent consumes no input itself
        } else {
            Err(ParseError::new(ParseErrorKind::IndentationError {
                at,
                kind: IndentErrorKind::NotGreater,
            }))
        }
    }

    fn eval_dedent(&mut self, at: InputOffset) -> StepParseResult {
        let new_indent = self.input.indentation(at, &self.grammar_info.config);
        if new_indent < self.current_indentation {
            // Pop from stack until new_indent matches a previous level or stack is empty (error).
            // Simple model: dedent if new_indent < current. The new current becomes new_indent.
            // A stricter model checks if new_indent is exactly a previous stack level.
            loop {
                if self.indentation_stack.len() <= 1 { // Cannot dedent past the base level (0)
                    return Err(ParseError::new(ParseErrorKind::IndentationError {
                        at,
                        kind: IndentErrorKind::NonAligned, // Or NotLess if stack empty
                    }));
                }
                // If new_indent is >= current (top of stack), it's not a dedent relative to *this* level.
                // This implies dedent should only match if new_indent < stack.top()
                // And then, new_indent must be == stack.second_from_top() for a single dedent.
                // The prompt's simple Indent/Dedent instructions suggest a simpler model:
                // Dedent matches if new_indent < current_indent. Update current_indent.
                if new_indent < self.current_indentation {
                    // Check if new_indent matches the level we'd pop to.
                    let prev_indent = self.indentation_stack.get(self.indentation_stack.len() - 2).cloned().unwrap_or(0);
                    if new_indent == prev_indent {
                        self.indentation_stack.pop();
                        self.current_indentation = new_indent;
                        return Ok((at, None, None)); // Matched one dedent level
                    } else if new_indent < prev_indent { // Further dedent needed
                        self.indentation_stack.pop();
                        self.current_indentation = prev_indent; // Temporarily set to popped level to continue loop
                        // Continue loop for multi-dedent
                    } else { // new_indent > prev_indent but < current_indent: misalignment
                        return Err(ParseError::new(ParseErrorKind::IndentationError{
                            at,
                            kind: IndentErrorKind::NonAligned,
                        }));
                    }
                } else { // new_indent >= self.current_indentation (should be strictly less from outer if)
                    return Err(ParseError::new(ParseErrorKind::IndentationError {
                        at,
                        kind: IndentErrorKind::NotLess,
                    }));
                }
            }

        } else { // new_indent >= self.current_indentation
            Err(ParseError::new(ParseErrorKind::IndentationError {
                at,
                kind: IndentErrorKind::NotLess,
            }))
        }
    }

    fn eval_variable(&mut self, name: &str, at: InputOffset) -> StepParseResult {
        if let Some(value) = self.grammar_info.config.variables.get(name) {
            // Treat the variable's value as a literal to match
            self.eval_literal(value, at)
        } else {
            Err(ParseError::new(ParseErrorKind::VariableNotFound{ name: name.to_string(), at }))
        }
    }

    fn eval_trap(&mut self, trap_id: RuleId, rule: &Instruction, at: InputOffset) -> StepParseResult {
        match self.eval_instruction(rule, at) {
            Ok(res) => Ok(res),
            Err(e) => {
                self.recovered_errors.push(ParseError::new(ParseErrorKind::TrapTriggered {
                    trap_id,
                    at, // Error occurred at 'at' because the inner rule failed there
                    underlying_error: Some(Box::new(e)),
                }));
                // Trap itself "succeeds" by catching the error, but consumes no input
                // and produces no node beyond what the recovery strategy might do.
                // For now, it means the enclosing Choice or Optional can continue.
                // This behavior (returning Ok or Err) depends on recovery.
                // For "single parse, multiple errors", Trap means the error is recorded,
                // and parsing *tries* to continue. So, Trap itself doesn't fail the parent Choice.
                // It needs to return an "error was handled, continue" signal.
                // This is tricky. Let's make it an Err that is special.
                // Or, Trap always "succeeds" but produces no node, error is in recovered_errors.
                Ok((at, None, None)) // Error handled, rule "matched" by consuming nothing.
            }
        }
    }

    fn eval_external(&mut self, custom_id: RuleId, at: InputOffset) -> StepParseResult {
        // Find custom parser by ID. Need a map from custom_id to function.
        // For now, assume custom_id is a key in grammar_info.custom_parsers (if it stored by ID)
        // Or, we need a custom_id_to_name map, then lookup in custom_parsers by name.
        // Let's find the name for this custom_id first.
        let rule_name = self.grammar_info.custom_name_to_id.iter()
            .find_map(|(name, &id)| if id == custom_id { Some(name) } else { None });

        if let Some(name) = rule_name {
            if let Some(parser_fn) = self.grammar_info.custom_parsers.get(name) {
                match parser_fn(self, at) { // `self` is `&mut ParserState`
                    Ok((next_offset, green_node)) => Ok((next_offset, Some(green_node), None)),
                    Err(e) => Err(e), // Custom parser returned an error
                }
            } else {
                Err(ParseError::new(ParseErrorKind::ExternalRuleMismatch { custom_id, at })) // Should not happen
            }
        } else {
            Err(ParseError::new(ParseErrorKind::ExternalRuleMismatch { custom_id, at })) // ID not found
        }
    }

    fn eval_pinned(&mut self, rule: &Instruction, at: InputOffset) -> StepParseResult {
        if !self.is_pinned_choice_active {
            // Pinned outside a choice has no special effect, just parse inner rule
            return self.eval_instruction(rule, at);
        }

        // Inside a choice, attempt to parse the rule
        match self.eval_instruction(rule, at) {
            Ok(res) => {
                self.pin_committed = true; // Signal to Choice that it must commit
                Ok(res)
            }
            Err(e) => {
                self.pin_committed = true; // Pin also commits on failure (prevents trying other alternatives)
                Err(ParseError::new(ParseErrorKind::PinnedRuleFailed {
                    // We need a way to identify which pinned rule failed, if `rule` is complex.
                    // If `rule` is `Rule { id }`, we can use that id.
                    rule_id: if let Instruction::Rule {id} = rule.as_ref() { Some(*id) } else {None},
                    at,
                }))
            }
        }
    }

    // --- Pratt Parsing ---
    // This is a simplified entry point. A full Pratt parser is more involved.
    fn eval_pratt_expression(&mut self, pratt_rule_id: RuleId, at: InputOffset) -> StepParseResult {
        // This is called when an `Instruction::PrattExpression` is encountered,
        // which should be the result of compiling a `Rule::RuleRef` to a Pratt-defined rule.
        self.parse_pratt_expr_entry(pratt_rule_id, at)
    }

    // Actual Pratt parsing logic (simplified: Precedence Climbing)
    // `min_precedence` is used for recursion in precedence climbing.
    fn parse_pratt_expr_recursive(&mut self, pratt_config: &PrattRuleConfig, mut current_at: InputOffset, min_precedence: u8) -> ParseResult<(InputOffset, GreenNode)> {
        // 1. Parse primary expression (lhs)
        let primary_rule_id = pratt_config.primary_rule_id.ok_or_else(|| ParseError::generic("Pratt primary rule ID missing".to_string(), current_at))?;

        // Temporarily treat the primary_rule_id as a standard rule to parse
        // This might involve calling eval_rule, which could recurse into Pratt if primary itself is Pratt (unlikely for typical primary)
        let (mut lhs_next_at, lhs_node_opt, _lhs_tag) = self.eval_rule(primary_rule_id, current_at)?;
        let mut lhs_node = lhs_node_opt.ok_or_else(|| ParseError::generic("Pratt primary expression did not produce a node".to_string(), current_at))?;
        current_at = lhs_next_at;

        // 2. Loop for infix operators
        loop {
            // Peek for an operator
            let mut best_op: Option<(&PrattOperator, InputOffset, Option<GreenNode>)> = None;

            for op_config in &pratt_config.operators {
                if op_config.op_type != PrattOperatorType::Infix { continue; }
                if op_config.precedence < min_precedence { continue; }

                // Try to parse the operator at current_at
                // The operator's rule (op_config.rule) needs to be evaluated.
                // This is a simplified placeholder for compiling and running op_config.rule.
                // If op_config.op_rule_id is set, use it.
                let op_instr = if let Some(op_rule_id) = op_config.op_rule_id {
                    self.grammar_info.instructions_map.get(&op_rule_id)
                } else {
                    // If op_config.rule is e.g. Literal{"+"}, we need to eval that directly.
                    // This requires a temporary compilation or direct handling here.
                    // For now, assume op_rule_id is resolved.
                    None
                };

                if let Some(instr) = op_instr {
                    // Store current indentation to restore if op parsing fails or is lookahead
                    let pre_op_indent_stack = self.indentation_stack.clone();
                    let pre_op_current_indent = self.current_indentation;

                    if let Ok((op_next_at, op_node_opt, _op_tag)) = self.eval_instruction(instr, current_at) {
                        if best_op.is_none() || op_config.precedence > best_op.as_ref().unwrap().0.precedence {
                            best_op = Some((op_config, op_next_at, op_node_opt));
                        }
                        // Backtrack indentation changes if this op is not chosen or fails later
                        self.indentation_stack = pre_op_indent_stack.clone();
                        self.current_indentation = pre_op_current_indent;
                    } else {
                        self.indentation_stack = pre_op_indent_stack;
                        self.current_indentation = pre_op_current_indent;
                    }
                }
            }

            if let Some((op_config, op_next_at, op_node_opt)) = best_op {
                let next_min_precedence = if op_config.associativity == Some(Associativity::Left) {
                    op_config.precedence + 1
                } else {
                    op_config.precedence // For right-associative
                };

                // We found an operator. Consume it.
                current_at = op_next_at;

                // Parse RHS
                let (rhs_next_at, rhs_node) = self.parse_pratt_expr_recursive(pratt_config, current_at, next_min_precedence)?;
                current_at = rhs_next_at;

                // Combine LHS, Op, RHS into a new node
                let mut children = vec![lhs_node];
                if let Some(op_n) = op_node_opt { children.push(op_n); } // Operator node if it exists
                children.push(rhs_node);

                // The 'kind' for this new node is the pratt_rule_id itself.
                // Tag could be from operator config.
                let tag_id = op_config.tag_name.as_ref()
                    .and_then(|name| self.grammar_info.tag_name_to_id.get(name).cloned())
                    .unwrap_or(0);

                lhs_node = self.node_pool.alloc(
                    self.language_id,
                    pratt_config.self_rule_id.unwrap(), // Kind is the ID of the Pratt rule itself
                    tag_id,
                    (current_at - (lhs_next_at - lhs_node.node_id as u64/*approx start of lhs*/)) as u32, // length is tricky here, need start of lhs
                    children.into_iter().collect(),
                );
            } else {
                break; // No more operators, or lower precedence
            }
        }
        Ok((current_at, lhs_node))
    }

    fn parse_pratt_expr_entry(&mut self, pratt_rule_id: RuleId, at: InputOffset) -> StepParseResult {
        let pratt_config = self.grammar_info.pratt_configs.get(&pratt_rule_id)
            .ok_or_else(|| ParseError::generic("Pratt config not found for rule ID".to_string(), at))?;

        // Need to clone pratt_config because parse_pratt_expr_recursive takes &PrattRuleConfig
        // while self is mutable. This is a common Rust borrow checker dance.
        // An Rc<PrattRuleConfig> in GrammarInfo would be better.
        let config_clone = pratt_config.clone();

        match self.parse_pratt_expr_recursive(&config_clone, at, 0) {
            Ok((next_offset, node)) => Ok((next_offset, Some(node), None)), // No specific tag from the entry point
            Err(e) => Err(e),
        }
    }
}
