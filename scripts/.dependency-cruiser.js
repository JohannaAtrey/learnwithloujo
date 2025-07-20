// This configuration defines dependency rules for the project using dependency-cruiser.
// It forbids circular dependencies and unused ("orphan") modules, and specifies paths and settings to ignore during analysis.

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "warn",
      comment: "Circular dependencies are not allowed",
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "This module is not used anywhere",
      from: {
        orphan: true,
        pathNot: "\\.(test|spec)\\.[jt]sx?$"
      },
      to: {}
    }
  ],
  options: {
    doNotFollow: {
      path: "node_modules"
    },
    exclude: {
      path: "node_modules|.next|out|build",
      dynamic: true
    },
    tsConfig: {
      fileName: "tsconfig.json"
    }
  }
}; 