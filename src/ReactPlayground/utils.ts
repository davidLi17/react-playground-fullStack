// 引入fflate库中的函数，用于字符串和字节数组的转换以及压缩和解压缩
import { strFromU8, strToU8, unzlibSync, zlibSync } from "fflate"
// 引入PlaygroundContext模块中的Files类型
import { Files } from "./PlaygroundContext"
// 引入JSZip库，用于创建和操作ZIP文件
import JSZip from "jszip"
// 引入file-saver库中的saveAs函数，用于保存文件
import { saveAs } from 'file-saver'
// 引入自定义类型FileLanguage，用于表示文件的语言类型
import { FileLanguage } from "./types/file"

// 导出一个函数，根据文件名返回对应的语言类型
export const fileName2Language = (name: string): FileLanguage => {
    // 获取文件名的后缀
    const suffix = name.split('.').pop() || ''
    // 根据后缀判断并返回对应的语言类型
    if (['js', 'jsx'].includes(suffix)) return 'javascript'
    if (['ts', 'tsx'].includes(suffix)) return 'typescript'
    if (['json'].includes(suffix)) return 'json'
    if (['css'].includes(suffix)) return 'css'
    // 默认返回javascript
    return 'javascript'
}

// 导出一个函数，用于压缩字符串数据
export function compress(data: string): string {
    // 将字符串转换为字节数组
    const buffer = strToU8(data)
    // 使用zlib算法进行压缩，压缩级别为9（最高）
    const zipped = zlibSync(buffer, { level: 9 })
    // 将压缩后的字节数组转换为字符串
    const str = strFromU8(zipped, true)
    // 将字符串转换为Base64编码
    return btoa(str)
}

// 导出一个函数，用于解压缩Base64编码的字符串
export function uncompress(base64: string): string {
    // 将Base64编码转换为二进制字符串
    const binary = atob(base64)

    // 将二进制字符串转换为字节数组
    const buffer = strToU8(binary, true)
    // 使用zlib算法进行解压缩
    const unzipped = unzlibSync(buffer)
    // 将解压缩后的字节数组转换为字符串
    return strFromU8(unzipped)
}

// 导出一个异步函数，用于下载多个文件为ZIP包
export async function downloadFiles(files: Files) {
    // 创建一个新的JSZip实例
    const zip = new JSZip()

    // 遍历文件对象，将每个文件添加到ZIP包中
    Object.keys(files).forEach((name) => {
        zip.file(name, files[name].value)
    })

    // 生成ZIP包的Blob对象
    const blob = await zip.generateAsync({ type: 'blob' })
    // 使用file-saver库的saveAs函数保存ZIP文件，文件名包含随机字符串
    saveAs(blob, `code${Math.random().toString().slice(2, 8)}.zip`)
}