import { Plugin } from 'vite'

// 创建一个移除 console.log 和 console.info 的插件
export function removeConsolePlugin(): Plugin {
  return {
    name: 'vite-plugin-remove-console',
    apply: 'build', // 只在生产环境应用
    transform(code, id) {
      //code 是源代码，id 是文件路径
      //code=>源代码
      //比如id => /src/vitePlugin/index.ts
      // 排除 node_modules 文件夹下的文件
       if (!/\.(js|ts|jsx|tsx)$/.test(id) || id.includes('node_modules')) {
        return null;
      }
      // 只处理 JavaScript 和 TypeScript 文件
      if (/\.(js|ts|jsx|tsx)$/.test(id)) {
        // 使用更精确的正则表达式移除 console.log 和 console.info 语句
        // 匹配 console.log 和 console.info，但不匹配 console.warn 和 console.error
        const result = code
          // 匹配 console.log(...)
          .replace(/console\.log\s*\(([^;]*)\);?/g, '')
          // 匹配 console.info(...)
          .replace(/console\.info\s*\(([^;]*)\);?/g, '');
        
        return {
          code: result,
          map: null // 不需要生成 source map
        }
      }
    }
  }
}