use crate::grammar::GrammarConfig;
use std::borrow::Cow;
use std::ops::Range;

pub type InputOffset = u64;

/// Input stream trait, supports character matching and position information
pub trait InputStream {
    /// Match a single character
    fn match_char(&self, c: char, at: InputOffset) -> Option<InputOffset>;

    /// Match a string
    fn match_str(&self, s: &str, at: InputOffset) -> Option<InputOffset>;

    /// Check if the end of the inputs stream is reached
    fn match_eof(&self, at: InputOffset) -> bool;

    /// Get the content of the specified range as a string
    fn view(&self, range: Range<InputOffset>) -> Cow<str>;

    /// Calculate the indentation level at the given offset.
    /// `at` is typically the offset after a newline, where indentation is expected.
    fn indentation(&self, at: InputOffset, config: &GrammarConfig) -> u32;

    /// Get character at a given offset
    fn char_at(&self, at: InputOffset) -> Option<char>;

    /// Length of the inputs in bytes
    fn len_bytes(&self) -> u64;
}

impl<'a> InputStream for &'a str {
    fn match_char(&self, c: char, at: InputOffset) -> Option<InputOffset> {
        let offset = at as usize;
        // Ensure `offset` is within bounds and `c` can actually fit
        if offset >= self.len() {
            return None;
        }
        let slice = &self[offset..];
        if slice.starts_with(c) {
            Some(at + c.len_utf8() as InputOffset)
        } else {
            None
        }
    }

    fn match_str(&self, s: &str, at: InputOffset) -> Option<InputOffset> {
        let offset = at as usize;
        if offset >= self.len() {
            return if s.is_empty() { Some(at) } else { None };
        }
        let slice = &self[offset..];
        if slice.starts_with(s) {
            Some(at + s.len() as InputOffset)
        } else {
            None
        }
    }

    fn match_eof(&self, at: InputOffset) -> bool {
        at as usize >= self.len()
    }

    fn view(&self, range: Range<InputOffset>) -> Cow<str> {
        let start = range.start as usize;
        let end = (range.end as usize).min(self.len()); // Ensure end is not out of bounds
        if start > end { // Handle invalid range
            return Cow::Borrowed("");
        }
        match self.get(start..end) {
            Some(s) => Cow::Borrowed(s),
            None => Cow::Borrowed(""), // Should ideally not happen if start/end are managed well
        }
    }

    fn indentation(&self, at: InputOffset, config: &GrammarConfig) -> u32 {
        let mut effective_at = (at as usize).min(self.len());

        let mut line_start_idx = 0;
        // Find the beginning of the line where `effective_at` is located.
        // If `effective_at` is 0, it's the first line.
        // If char at `effective_at - 1` is `\n`, then `effective_at` is start of a new line.
        if effective_at > 0 {
            // Search backwards for the character immediately preceding `effective_at`.
            // If `effective_at` points to the start of the string or after a newline,
            // then `line_start_idx` should be `effective_at`.
            // This finds the start of the line that CONTAINS `effective_at`.
            let mut p = effective_at;
            while p > 0 {
                // Check character before p
                let mut char_before_p_is_newline = false;
                for (idx, char_val) in self.char_indices().rev() {
                    if idx < p { // Found a char whose start is before p
                        if char_val == '\n' {
                            char_before_p_is_newline = true;
                            line_start_idx = idx + char_val.len_utf8();
                        }
                        break; // We only care about the char immediately before p's potential start
                    }
                }
                if char_before_p_is_newline || p == 0 { // Found newline or beginning of string
                    break;
                }
                // This reverse search is tricky. A simpler way for rfind:
                if let Some(last_newline_pos) = self[..effective_at].rfind('\n') {
                    line_start_idx = last_newline_pos + 1; // +1 to be after the newline
                } else {
                    line_start_idx = 0; // It's the first line
                }
                break; // Only need to do this once
            }
        }

        let mut indent_val = 0;
        // Iterate over characters from the start of the line.
        for c in self[line_start_idx..].chars() {
            // Only count whitespace. Stop if we encounter a non-whitespace char
            // or if we parse past where 'at' was (though 'at' should be at start of content for indent checks).
            if (line_start_idx + c.len_utf8() > effective_at) && (line_start_idx < effective_at) {
                // If `effective_at` is in the middle of a multi-byte char that is part of indentation,
                // this logic might be slightly off. For PEG Indent/Dedent, `at` is usually
                // at a token boundary *after* indentation.
                // The definition is: "indentation of the line containing 'at'".
            }

            match c {
                ' ' => indent_val += 1,
                '\t' => indent_val += config.tab_as_space.max(1), // tab_as_space should be at least 1
                '\n' => break, // Newline character itself is not indentation for the *next* line.
                '\r' => break, // Similar to newline.
                _ => break,    // First non-whitespace character
            }
        }
        indent_val
    }

    fn char_at(&self, at: InputOffset) -> Option<char> {
        let offset = at as usize;
        self.get(offset..)?.chars().next()
    }

    fn len_bytes(&self) -> u64 {
        self.len() as u64
    }
}
