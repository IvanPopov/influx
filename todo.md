## TODO (Prioritized)
***

### General plan

1. ~~Generate the simplest working bytecode!~~
    1. ~~No optimizations~~
    2. ~~No vectorization.~~
    3. ~~No math optimizations.~~
    4. ~~No anything.~~
2. ~~Implement test VM in typescript for testing.~~
3. ~~Implement the simplest compute shader.~~
4. ~~Implement the simplest ui for node programming~~

### Editor
1. ~~Accelerate text input (remove freezes).~~
2. Add determination of the current scope inside code.
3. Add dynamic highlighting of all functions and other dynamically added objects.
4. Add highlighting of all occurancies of identidier.
5. Add autocomplete.
6. Add info about identifiers when selected by mouse.

### Other
1. ~~Remove useless dependecies from package.json~~
2. ~~Add production config.~~
3. Add version variable to bundle (with commit id).
4. Use proper relative path in theme.config for site folder.
5. Use react semantic ui loader instead of direct 'require'. 

***

### Graph Issues ##
 + Add ability to update playground on any change is occured

### Known Issues

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