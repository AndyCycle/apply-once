# Verified development lessons

Only add lessons supported by a reproducible defect, failing test, CI run or reviewed commit. Each entry records evidence, root cause, the rule that would have caught it, and a verification method. Keep proposed improvements in issues or development plans.

## Entry format

- Date and affected module:
- Evidence: issue/commit/test/run URL, with the observed failure.
- Root cause:
- Prevention rule:
- Regression check:

## 2026-10-15: Panel test loading must accept CRLF

- Evidence: [Windows CI failure](https://github.com/AndyCycle/apply-once/actions/runs/38749023215) at `f76af2c`; four panel tests failed with `Cannot use import statement outside a module`. A local LF/CRLF regression pair then reproduced the CRLF-only failure before the fix.
- Root cause: the jsdom harness removed imports with a pattern requiring LF immediately after the semicolon; Windows checkout used CRLF.
- Prevention rule: source transformations must account for both line endings. Run CI on the supported development operating systems; a passing local checkout alone does not validate fresh Windows checkout behavior.
- Regression check: `panel loader executes LF source` and `panel loader executes CRLF source` execute the real panel source with both newline forms. Keep the Windows/Linux matrix.
- Scope: test harness only; extension runtime code is unchanged.
