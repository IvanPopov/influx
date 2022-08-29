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
 + ~~Add ability to update playground on any change is occured~~

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

### Graph
+ add color picker!
+ ~~Resolve link/nodes types for Operators (nodes which are supported multiple type for inputs)~~
+ Add support of CTRL+Z
+ Generator nodes from expressions
+ Search nodes by word distance instead of exact match
+ Colorize nodes of different nature like uniforms, operators etc
+ Add support for icons in node's titles
+ Allow to pick correct output node when while connection to nowhere (fix auto pop-up menu)
+ Allow to connect outputs from collapsed nodes
+ Add action with ability to invert condition
+ Add ability to set default constants quickly (for unconnected nodes)
+ Allow to hide subgraphs
+ Fix spawners inputs if spawners logic is changed
+ Add support of comments (like groups)
+ Allow easy group renaming (via double click on group title)
+ highlight nodes with warnings (for ex if operation leads to loss of precision)
+ add portals (ability to make a mirror of node to be able to connect from mirrot not from original node)
+ add ability to add named constants