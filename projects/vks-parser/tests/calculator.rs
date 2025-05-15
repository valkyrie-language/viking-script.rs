use vks_parser::{CompileError, GrammarBuilder, GrammarInfo, ParserState, Rule};
use vks_parser::grammar::{Associativity, PrattOperator, OperatorType};

fn build_calculator_grammar() -> Result<GrammarInfo, Vec<CompileError>> {
    let mut gb = GrammarBuilder::new();

    // Number rule: matches floating point numbers
    gb.add_rule("Number".to_string(), Rule::Regex { regex_str: r"\d+(\.\d*)?".to_string() }).unwrap();

    // Primary expression for Pratt parser
    gb.add_rule(
        "Primary".to_string(),
        Rule::Choice {
            rules: vec![
                Rule::RuleRef { name: "Number".to_string() },
                Rule::Sequence {
                    // Parenthesized expression
                    rules: vec![
                        Rule::Literal { text: "(".to_string() },
                        Rule::RuleRef { name: "Expression".to_string() }, // Recursive call
                        Rule::Literal { text: ")".to_string() },
                    ],
                },
            ],
        },
    )
    .unwrap();

    // Define Pratt operators for "Expression"
    let operators = vec![
        PrattOperator {
            op_type: OperatorType::Infix,
            rule: Rule::Literal { text: "+".to_string() },
            precedence: 1,
            associativity: Some(Associativity::Left),
            op_rule_id: None,
            tag_name: Some("op_add".to_string()),
        },
        PrattOperator {
            op_type: OperatorType::Infix,
            rule: Rule::Literal { text: "-".to_string() },
            precedence: 1,
            associativity: Some(Associativity::Left),
            op_rule_id: None,
            tag_name: Some("op_sub".to_string()),
        },
        PrattOperator {
            op_type: OperatorType::Infix,
            rule: Rule::Literal { text: "*".to_string() },
            precedence: 2,
            associativity: Some(Associativity::Left),
            op_rule_id: None,
            tag_name: Some("op_mul".to_string()),
        },
        PrattOperator {
            op_type: OperatorType::Infix,
            rule: Rule::Literal { text: "/".to_string() },
            precedence: 2,
            associativity: Some(Associativity::Left),
            op_rule_id: None,
            tag_name: Some("op_div".to_string()),
        },
        PrattOperator {
            // Exponentiation (right associative)
            op_type: OperatorType::Infix,
            rule: Rule::Literal { text: "^".to_string() },
            precedence: 3,
            associativity: Some(Associativity::Right),
            op_rule_id: None,
            tag_name: Some("op_pow".to_string()),
        },
    ];

    gb.add_pratt_rule("Expression".to_string(), "Primary".to_string(), operators).unwrap();

    gb.compile()
}

#[test]
fn test_calculator_simple_addition() {
    let grammar_info = build_calculator_grammar().expect("Calculator grammar compilation failed");
    let input = "1+2";
    let expr_rule_id = *grammar_info.rule_name_to_id.get("Expression").unwrap();

    let mut parser_state = ParserState::new(&grammar_info, &input, 0);

    match parser_state.parse_root(expr_rule_id) {
        Ok((Some(green_node), errors)) => {
            assert!(errors.is_empty(), "Parse errors: {:?}", errors);
            // Further inspect green_node structure if needed
            let node_data = parser_state.node_pool.get(green_node).unwrap();
            assert_eq!(node_data.kind, expr_rule_id); // Check if it's an Expression node
            assert_eq!(node_data.length, input.len() as u32);
        }
        Ok((None, errors)) => {
            panic!("Parsing succeeded but produced no node. Errors: {:?}", errors);
        }
        Err(e) => {
            panic!("Parsing failed: {:?}", e);
        }
    }
}

#[test]
fn test_calculator_precedence() {
    let grammar_info = build_calculator_grammar().expect("Calculator grammar compilation failed");
    let input = "1+2*3"; // Should be 1 + (2*3)
    let expr_rule_id = *grammar_info.rule_name_to_id.get("Expression").unwrap();
    let mut parser_state = ParserState::new(&grammar_info, &input, 0);

    let (node_opt, _errs) = parser_state.parse_root(expr_rule_id).expect("Parse failed");
    assert!(node_opt.is_some(), "No node produced");
    // To verify precedence, one would need to inspect the structure of the GreenNode tree.
    // E.g., the top node should be '+', with '1' as lhs and '(2*3)' as rhs.
    // This requires a tree traversal utility or more detailed assertions on node kinds and children.
}

// TODO: More calculator tests: parentheses, right associativity for power, errors.
