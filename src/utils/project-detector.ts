import * as fs from 'fs';
import * as path from 'path';

export interface ProjectInfo {
  language: string;
  framework?: string;
  packageManager?: string;
  test: string;
  testCommand: string;
  buildCommand: string;
  lintCommand?: string;
  installCommand: string;
  runCommand: string;
}

export interface CommandMap {
  [language: string]: {
    [packageManager: string]: {
      testCommand: string;
      buildCommand: string;
      lintCommand?: string;
      installCommand: string;
      runCommand: string;
    };
  };
}

const COMMAND_MAP: CommandMap = {
  python: {
    uv: {
      testCommand: 'uv run pytest',
      buildCommand: 'uv build',
      lintCommand: 'uv run ruff check',
      installCommand: 'uv sync',
      runCommand: 'uv run'
    },
    poetry: {
      testCommand: 'poetry run pytest',
      buildCommand: 'poetry build',
      lintCommand: 'poetry run ruff check',
      installCommand: 'poetry install',
      runCommand: 'poetry run'
    },
    pip: {
      testCommand: 'python -m pytest',
      buildCommand: 'python setup.py build',
      installCommand: 'pip install -e .',
      runCommand: 'python -m'
    }
  },
  typescript: {
    npm: {
      testCommand: 'npm test',
      buildCommand: 'npm run build',
      lintCommand: 'npm run lint',
      installCommand: 'npm install',
      runCommand: 'npm start'
    },
    yarn: {
      testCommand: 'yarn test',
      buildCommand: 'yarn build',
      lintCommand: 'yarn lint',
      installCommand: 'yarn install',
      runCommand: 'yarn start'
    },
    pnpm: {
      testCommand: 'pnpm test',
      buildCommand: 'pnpm build',
      lintCommand: 'pnpm lint',
      installCommand: 'pnpm install',
      runCommand: 'pnpm start'
    }
  },
  javascript: {
    npm: {
      testCommand: 'npm test',
      buildCommand: 'npm run build',
      lintCommand: 'npm run lint',
      installCommand: 'npm install',
      runCommand: 'npm start'
    },
    yarn: {
      testCommand: 'yarn test',
      buildCommand: 'yarn build',
      lintCommand: 'yarn lint',
      installCommand: 'yarn install',
      runCommand: 'yarn start'
    },
    pnpm: {
      testCommand: 'pnpm test',
      buildCommand: 'pnpm build',
      lintCommand: 'pnpm lint',
      installCommand: 'pnpm install',
      runCommand: 'pnpm start'
    }
  },
  go: {
    go: {
      testCommand: 'go test ./...',
      buildCommand: 'go build',
      installCommand: 'go mod download',
      runCommand: 'go run'
    }
  },
  rust: {
    cargo: {
      testCommand: 'cargo test',
      buildCommand: 'cargo build',
      lintCommand: 'cargo clippy',
      installCommand: 'cargo build',
      runCommand: 'cargo run'
    }
  },
  java: {
    maven: {
      testCommand: 'mvn test',
      buildCommand: 'mvn package',
      lintCommand: 'mvn checkstyle:check',
      installCommand: 'mvn install',
      runCommand: 'mvn exec:java'
    },
    gradle: {
      testCommand: './gradlew test',
      buildCommand: './gradlew build',
      installCommand: './gradlew build',
      runCommand: './gradlew run'
    }
  },
  csharp: {
    dotnet: {
      testCommand: 'dotnet test',
      buildCommand: 'dotnet build',
      lintCommand: 'dotnet format --check',
      installCommand: 'dotnet restore',
      runCommand: 'dotnet run'
    }
  }
};

export class ProjectDetector {
  private workingDirectory: string;

  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
  }

  /**
   * Detect project type and return appropriate commands
   */
  detectProject(): ProjectInfo {
    const files = fs.readdirSync(this.workingDirectory);

    // Python detection
    if (files.includes('pyproject.toml')) {
      return this.detectPythonProject();
    }
    if (files.includes('setup.py') || files.includes('requirements.txt')) {
      return this.detectPythonProject();
    }

    // TypeScript/JavaScript detection
    if (files.includes('package.json')) {
      return this.detectJavaScriptProject();
    }

    // Go detection
    if (files.includes('go.mod')) {
      return this.detectGoProject();
    }

    // Rust detection
    if (files.includes('Cargo.toml')) {
      return this.detectRustProject();
    }

    // Java detection
    if (files.includes('pom.xml')) {
      return this.detectJavaProject('maven');
    }
    if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
      return this.detectJavaProject('gradle');
    }

    // C# detection
    if (files.some(file => file.endsWith('.csproj'))) {
      return this.detectCSharpProject();
    }

    // Fallback to generic
    return this.getFallbackProject();
  }

  private detectPythonProject(): ProjectInfo {
    try {
      const pyprojectPath = path.join(this.workingDirectory, 'pyproject.toml');
      if (fs.existsSync(pyprojectPath)) {
        const content = fs.readFileSync(pyprojectPath, 'utf-8');

        // Check for uv
        if (content.includes('[tool.uv]') || content.includes('uv ')) {
          return {
            language: 'python',
            packageManager: 'uv',
            framework: this.detectPythonFramework(),
            ...COMMAND_MAP.python.uv
          };
        }

        // Check for poetry
        if (content.includes('[tool.poetry]') || content.includes('poetry')) {
          return {
            language: 'python',
            packageManager: 'poetry',
            framework: this.detectPythonFramework(),
            ...COMMAND_MAP.python.poetry
          };
        }
      }
    } catch (error) {
      // Ignore errors and fall back
    }

    // Default to pip
    return {
      language: 'python',
      packageManager: 'pip',
      framework: this.detectPythonFramework(),
      ...COMMAND_MAP.python.pip
    };
  }

  private detectJavaScriptProject(): ProjectInfo {
    try {
      const packageJsonPath = path.join(this.workingDirectory, 'package.json');
      const content = fs.readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      // Detect package manager from lock files
      const files = fs.readdirSync(this.workingDirectory);
      let packageManager = 'npm';

      if (files.includes('yarn.lock')) {
        packageManager = 'yarn';
      } else if (files.includes('pnpm-lock.yaml')) {
        packageManager = 'pnpm';
      }

      const language = files.includes('tsconfig.json') ? 'typescript' : 'javascript';
      const framework = this.detectJavaScriptFramework(packageJson);

      return {
        language,
        packageManager,
        framework,
        ...COMMAND_MAP[language][packageManager]
      };
    } catch (error) {
      // Fallback
      return {
        language: 'javascript',
        packageManager: 'npm',
        ...COMMAND_MAP.javascript.npm
      };
    }
  }

  private detectGoProject(): ProjectInfo {
    return {
      language: 'go',
      packageManager: 'go',
      ...COMMAND_MAP.go.go
    };
  }

  private detectRustProject(): ProjectInfo {
    return {
      language: 'rust',
      packageManager: 'cargo',
      ...COMMAND_MAP.rust.cargo
    };
  }

  private detectJavaProject(packageManager: string): ProjectInfo {
    return {
      language: 'java',
      packageManager,
      ...COMMAND_MAP.java[packageManager]
    };
  }

  private detectCSharpProject(): ProjectInfo {
    return {
      language: 'csharp',
      packageManager: 'dotnet',
      ...COMMAND_MAP.csharp.dotnet
    };
  }

  private detectPythonFramework(): string | undefined {
    try {
      const files = fs.readdirSync(this.workingDirectory);

      if (files.includes('pyproject.toml')) {
        const content = fs.readFileSync(path.join(this.workingDirectory, 'pyproject.toml'), 'utf-8');
        if (content.includes('fastapi')) return 'fastapi';
        if (content.includes('django')) return 'django';
        if (content.includes('flask')) return 'flask';
      }

      if (files.includes('requirements.txt')) {
        const content = fs.readFileSync(path.join(this.workingDirectory, 'requirements.txt'), 'utf-8');
        if (content.includes('fastapi')) return 'fastapi';
        if (content.includes('django')) return 'django';
        if (content.includes('flask')) return 'flask';
      }
    } catch (error) {
      // Ignore
    }
    return undefined;
  }

  private detectJavaScriptFramework(packageJson: any): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.react) return 'react';
    if (deps.vue) return 'vue';
    if (deps.angular) return 'angular';
    if (deps.next) return 'nextjs';
    if (deps.nuxt) return 'nuxt';

    return undefined;
  }

  private getFallbackProject(): ProjectInfo {
    return {
      language: 'generic',
      testCommand: 'echo "No test command detected"',
      buildCommand: 'echo "No build command detected"',
      installCommand: 'echo "No install command detected"',
      runCommand: 'echo "No run command detected"'
    };
  }
}

export function detectProject(workingDirectory?: string): ProjectInfo {
  const detector = new ProjectDetector(workingDirectory);
  return detector.detectProject();
}