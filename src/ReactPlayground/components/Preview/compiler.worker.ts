// 导入 Babel 的 transform 函数用于代码转换
import { transform } from '@babel/standalone'
// 从 PlaygroundContext 中导入 File 和 Files 类型
import { File, Files } from '../../PlaygroundContext'
// 从 files 模块中导入入口文件名常量
import { ENTRY_FILE_NAME } from '../../files'
// 使用 @ts-ignore 忽略 TypeScript 的类型检查，导入 Babel 插件对象类型
//@ts-ignore
import { PluginObj } from '@babel/core';
//@ts-ignore
import { NodePath } from "@babel/traverse"

// 导出一个函数，用于在转换代码前处理 JSX 和 TSX 文件的 React 导入
export const beforeTransformCode = (filename: string, code: string) => {
    // 初始代码赋值给 _code 变量
    let _code = code
    // 定义正则表达式，用于检测代码中是否已经导入了 React
    const regexReact = /import\s+React/g
    // 如果文件名以 .jsx 或 .tsx 结尾，并且代码中没有导入 React
    if ((filename.endsWith('.jsx') || filename.endsWith('.tsx')) && !regexReact.test(code)) {
      // 在代码顶部添加 React 的导入语句
      _code = `import React from 'react';\n${code}`
    }
    // 返回处理后的代码
    return _code
}

// 导出一个函数，用于使用 Babel 转换代码
export const babelTransform = (filename: string, code: string, files: Files) => {
    // 先调用 beforeTransformCode 函数处理代码
    let _code = beforeTransformCode(filename, code);
    let result = '' // 初始化转换结果为空字符串
    try {
        // 使用 Babel 的 transform 函数进行代码转换
        result = transform(_code, {
        presets: ['react', 'typescript'], // 指定预设为 react 和 typescript
        filename, // 指定文件名
        plugins: [customResolver(files)], // 指定自定义解析插件
        retainLines: true // 保持原始代码的行数不变
        }).code! // 获取转换后的代码
    } catch (e) {
        // 如果转换过程中出现错误，打印错误信息
        // console.error('编译出错', e);
    }
    // 返回转换结果
    return result
}

// 定义一个函数，用于从文件集合中获取模块文件
const getModuleFile = (files: Files, modulePath: string) => {
    // 从模块路径中获取模块名
    let moduleName = modulePath.split('./').pop() || ''
    // 如果模块名不包含扩展名
    if (!moduleName.includes('.')) {
        // 过滤出所有可能的模块文件名
        const realModuleName = Object.keys(files).filter(key => {
            return key.endsWith('.ts') 
                || key.endsWith('.tsx') 
                || key.endsWith('.js')
                || key.endsWith('.jsx')
        }).find((key) => {
            // 找到匹配的模块文件名
            return key.split('.').includes(moduleName)
        })
        // 如果找到了真实模块名，更新 moduleName
        if (realModuleName) {
            moduleName = realModuleName
        }
      }
    // 返回对应的文件对象
    return files[moduleName]
}

// 定义一个函数，将 JSON 文件转换为 JavaScript 模块
const json2Js = (file: File) => {
    // 创建一个导出 JSON 内容的 JavaScript 字符串
    const js = `export default ${file.value}`
    // 返回一个指向该 JavaScript 内容的 URL
    return URL.createObjectURL(new Blob([js], { type: 'application/javascript' }))
}

// 定义一个函数，将 CSS 文件转换为 JavaScript 模块
const css2Js = (file: File) => {
    // 生成一个随机 ID
    const randomId = new Date().getTime()
    // 创建一个 JavaScript 字符串，用于动态插入样式表
    const js = `
(() => {
    const stylesheet = document.createElement('style')
    stylesheet.setAttribute('id', 'style_${randomId}_${file.name}')
    document.head.appendChild(stylesheet)

    const styles = document.createTextNode(\`${file.value}\`)
    stylesheet.innerHTML = ''
    stylesheet.appendChild(styles)
})()
    `
    // 返回一个指向该 JavaScript 内容的 URL
    return URL.createObjectURL(new Blob([js], { type: 'application/javascript' }))
}

// 定义一个函数，创建自定义解析插件
function customResolver(files: Files): PluginObj {
    return {
        visitor: {
            // 访问 ImportDeclaration 节点
            ImportDeclaration(path:NodePath) {
                // console.log("compiler.worker.ts path::", path);
                // 获取导入模块的路径
                const modulePath = path.node.source.value;
                // console.log("compiler.worker.ts modulePath::", modulePath);
                // 如果模块路径以 . 开头，表示是相对路径
                if(modulePath.startsWith('.')) {
                    // 获取对应的文件对象
                    const file = getModuleFile(files, modulePath)
                    // 如果文件不存在，直接返回
                    if(!file) 
                        return

                    // 根据文件类型，更新导入路径
                    if (file.name.endsWith('.css')) {
                        path.node.source.value = css2Js(file)
                    } else if (file.name.endsWith('.json')) {
                        path.node.source.value = json2Js(file)
                    } else {
                        path.node.source.value = URL.createObjectURL(
                            new Blob([babelTransform(file.name, file.value, files)], {
                                type: 'application/javascript',
                            })
                        )
                    }
                }
            }
        }
    }
}

// 导出一个函数，用于编译文件集合
export const compile = (files: Files) => {
  // 获取入口文件对象
  const main = files[ENTRY_FILE_NAME]
  // 使用 Babel 转换入口文件
  return babelTransform(ENTRY_FILE_NAME, main.value, files)
}

// 为当前 worker 添加消息监听事件
self.addEventListener('message', async ({ data }) => {
    try {
        // 向主线程发送编译后的代码
        self.postMessage({
            type: 'COMPILED_CODE',
            data: compile(data)
        })
    } catch (e) {
      // 如果编译过程中出现错误，发送错误信息
      self.postMessage({ type: 'ERROR', error: e })
    }
})