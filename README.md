
# Influx

[Influx](https://github.com/IvanPopov/Influx) is a toolset and sandbox for creatingprocedural visual effects that can run on both CPU and GPU. The library includes a parser, compiler and translator for the HLSL shader language and its special extended version for working with visual effects, conceptually similar to HLSL effects in D3D11. The sandbox includes all the necessary set of tools for creating procedural effects both in the form of code and visual programming tools known as blueprints, as well as a dedicated runtime based on both javascript and websm for playing effects on any platform.

## Installing

For the minimal setup:

```bash
npm install
```

To use web asm based runtime follow the instruction of [Emscripten](https://emscripten.org/docs/getting_started/downloads.html)

## Documentation

*  This repository includes a set of test effects of varying complexity.

## Building

In order to build the Influx sandbox, ensure that you have [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/) installed.

Clone a copy of the repo:

```bash
git clone -b develop https://github.com/IvanPopov/influx.git
```

Change to the Influx directory:

```bash
cd Influx
```

Use one of the following to build and test:

```bash
npm run build:web           # Build optimized web version.
npm run build:electron      # Build optimized unpacked electron based executable.
npm run dev:web             # Build debug web version.
npm run dev:electron        # Build debug unpacked electron based executable.
npm run dev-server:web      # Run dev server of web verion available at http://localhost:8080.
npm run dev-server:electron # Run dev server for electron based build. 
                            # Continuous rebuilding will be available as for the web version
                            # but without automatic reloading of electron windows.
npm run pack:electron       # Pack standlone build of electron version based on the latest 
                            # unpackd build.
npm run clean:electron      # Remove all temprary files relates to electron builds.
npm run package:electron    # Build packed and optimized electron based executable.
```


## Usage

```bash
npm run electron                        # Run sandbox with virtual enviroment.
                                        # (mount folder with test effects)
npm run electron -- [options...]        # Avalable options:
    --dev-tools                         # Run with dev tools.
    --project "path/to/project/root"    # Run from Saber 3d enviroment. 
npm run electron path/to/fx.bfx         # Run preview mode to show prebuild effect.
```

Most popular scenarios are:

- Regular development:
    1. ```npm run dev-server:electron```
    2. ```npm run electron -- --dev-tools``` 
    3. Manual page reload using Ctrl+R 
- Build package:
    1. ```npm run package:electron```


## Roadmap

For details on our planned features and future direction please refer to our [todo](https://github.com/IvanPopov/influx/blob/develop/todo.md).

