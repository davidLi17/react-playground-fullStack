import classnames from 'classnames' // 引入classnames库，用于条件类名合并
import React, { useState, useRef, useEffect, MouseEventHandler } from 'react' // 引入React及其相关钩子和类型

import styles from './index.module.scss' // 引入模块化样式文件
import { Popconfirm } from 'antd' // 引入Ant Design的Popconfirm组件

// 定义FileNameItem组件的属性接口
export interface FileNameItemProps {
    value: string // 文件名
    actived: boolean // 是否激活状态
    creating: boolean // 是否正在创建状态
    readonly: boolean // 是否只读
    onEditComplete: (name: string) => void // 编辑完成后的回调函数
    onRemove: () => void // 删除文件时的回调函数
    onClick: () => void // 点击文件时的回调函数
}

// 定义FileNameItem组件
export const FileNameItem: React.FC<FileNameItemProps> = (props) => {
  // 解构props获取相关属性
  const {
    value,
    actived = false, // 默认未激活
    readonly,
    creating,
    onClick,
    onRemove,
    onEditComplete,
  } = props

  // 使用useState钩子管理文件名状态
  const [name, setName] = useState(value);
  // 使用useState钩子管理编辑状态
  const [editing, setEditing] = useState(creating)
  // 使用useRef钩子获取输入框的引用
  const inputRef = useRef<HTMLInputElement>(null)

  // 处理双击事件，进入编辑状态
  const handleDoubleClick = () => {
    setEditing(true) // 设置为编辑状态
    setTimeout(() => {
      inputRef?.current?.focus() // 稍后聚焦到输入框
    }, 0)
  }

  // 使用useEffect钩子，在创建状态时聚焦到输入框
  useEffect(() => {
    if(creating) {
        inputRef?.current?.focus()
    }
  }, [creating]); // 依赖数组中包含creating，仅在creating变化时执行

  // 处理输入框失去焦点事件
  const hanldeInputBlur = () => {
    setEditing(false); // 退出编辑状态
    onEditComplete(name); // 调用编辑完成回调函数
  }

  // 渲染组件
  return (
    <div
      className={classnames(styles['tab-item'], actived ? styles.actived : null)} // 根据激活状态动态设置类名
      onClick={onClick} // 点击时触发onClick回调
    >
        {
            editing ? ( // 如果处于编辑状态
                <input
                    ref={inputRef} // 绑定输入框引用
                    className={styles['tabs-item-input']} // 设置输入框样式
                    value={name} // 设置输入框值
                    onBlur={hanldeInputBlur} // 失去焦点时触发
                    onChange={(e) => setName(e.target.value)} // 值变化时更新状态
                />
            ) : ( // 如果不处于编辑状态
                <React.Fragment>
                    <span onDoubleClick={!readonly ? handleDoubleClick : () => {}}>{name}</span>
                    {
                        !readonly ? ( // 如果非只读
                            <Popconfirm
                                title="确认删除该文件吗？" // 提示信息
                                okText="确定" // 确认按钮文本
                                cancelText="取消" // 取消按钮文本
                                onConfirm={(e) => {
                                    e?.stopPropagation(); // 阻止事件冒泡
                                    onRemove(); // 调用删除回调
                                }}
                            >
                                <span style={{ marginLeft: 5, display: 'flex' }}> 
                                    <svg width='12' height='12' viewBox='0 0 24 24'>
                                        <line stroke='#999' x1='18' y1='6' x2='6' y2='18'></line>
                                        <line stroke='#999' x1='6' y1='6' x2='18' y2='18'></line>
                                    </svg>
                                </span>
                            </Popconfirm>
                        ) : null // 如果只读，不显示删除图标
                    }
                </React.Fragment>
            )
        }
    </div>
  )
}