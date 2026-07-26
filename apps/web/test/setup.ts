import Module from "node:module"

type ModuleWithResolver = typeof Module & {
  _resolveFilename: (
    request: string,
    parent: unknown,
    isMain: boolean,
    options?: unknown
  ) => string
}

const ModuleResolver =
  Module as ModuleWithResolver

const originalResolveFilename =
  ModuleResolver._resolveFilename

ModuleResolver._resolveFilename =
  function (
    request,
    parent,
    isMain,
    options
  ) {
    if (request === "server-only") {
      return require.resolve(
        "./mocks/server-only.ts"
      )
    }

    return originalResolveFilename.call(
      this,
      request,
      parent,
      isMain,
      options
    )
  }