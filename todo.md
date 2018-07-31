## TODO (Prioritized)
***
+ Refactor for instructions set.
+ Add pure functions and expressions check;
+ Highlight all expressions that don't have any impact.
+ Compute constexpr. 
+ Check type conversions. 
+ Generate tri-addr notation.
+ Mark const/out arguments 
+ Mark dead code after return/break/loops. 
+ Add support for multi-dimensional arrays. 
+ Add binary operations support.
+ Add automaic conversion for numbers. (float to int for ex.)
+ Add test: function evaluation using JS. (translation to js)
+ Add Directx10 sampler state support.
    - https://msdn.microsoft.com/ru-ru/library/windows/desktop/bb509644(v=vs.85).aspx
+ Add Sampler1D support.
+ Move "resolve()" inside of variable/function expressions.
+ Rewrite "include" logic, fix incorrect source locations after included file.
    - Fix error highlighting for included pathes.
+ Remove unnecessary punctor ';' after include state (rollback last token, before call 'includeCode' routine).
+ Fix problems with Hex/Octal number notations.
+ Add support for binary number notations like 0b10101.
+ Add "unsigned" typed support. 
+ Move instructions properties from getters to 'readonly' prtoperties.
+ Handle lexer errors.
    - Add visualization.
+ Handle grammar errors.
    - Add visualization.
+ Cleanup containers/components separation.
+ Move all info about system types/functions/macroses into separated enviroment setup.
+ Add support for non-debug runtime (without debug middleware)
+ Remove "markers" from store.
    - Subscribe to the logger events to display errors.
+ Visualize expected/unexpected info for syntax errors.
+ Add error icon into tab header in case of errors.
+ Add comment to AST.
    - Add leading/trailing comments to parsed nodes.
+ Add browser version.

***