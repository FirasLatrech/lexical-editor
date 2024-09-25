/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { $createCodeNode } from '@lexical/code'
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list'
import { INSERT_EMBED_COMMAND } from '@lexical/react/LexicalAutoEmbedPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode'
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import { INSERT_TABLE_COMMAND } from '@lexical/table'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_ELEMENT_COMMAND,
  LexicalEditor,
  TextNode,
} from 'lexical'
import { useCallback, useMemo, useState } from 'react'
import * as ReactDOM from 'react-dom'
import './style.css'
import useModal from '../../hooks/useModal'
import catTypingGif from '../../images/cat-typing.gif'
import { EmbedConfigs } from '../AutoEmbedPlugin'
import { INSERT_COLLAPSIBLE_COMMAND } from '../CollapsiblePlugin'
import { InsertEquationDialog } from '../EquationsPlugin'
import { INSERT_EXCALIDRAW_COMMAND } from '../ExcalidrawPlugin'
import { INSERT_IMAGE_COMMAND, InsertImageDialog } from '../ImagesPlugin'
import InsertLayoutDialog from '../LayoutPlugin/InsertLayoutDialog'
import { INSERT_PAGE_BREAK } from '../PageBreakPlugin'
import { InsertPollDialog } from '../PollPlugin'
import { InsertTableDialog } from '../TablePlugin'

class ComponentPickerOption extends MenuOption {
  // What shows up in the editor
  title: string
  // Icon for display
  icon?: JSX.Element
  // For extra searching.
  keywords: Array<string>
  // TBD
  keyboardShortcut?: string
  // What happens when you select this option?
  onSelect: (queryString: string) => void

  constructor(
    title: string,
    options: {
      icon?: JSX.Element
      keywords?: Array<string>
      keyboardShortcut?: string
      onSelect: (queryString: string) => void
    }
  ) {
    super(title)
    this.title = title
    this.keywords = options.keywords || []
    this.icon = options.icon || <></>
    this.keyboardShortcut = options.keyboardShortcut || ''
    this.onSelect = options.onSelect.bind(this)
  }
}

function ComponentPickerMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
  icon,
  text,
}: {
  index: number
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
  option: ComponentPickerOption
  icon?: JSX.Element
  text?: string
}) {
  let className = 'item'
  if (isSelected) {
    className += ' selected'
  }
  return (
    <div
      key={option?.key}
      tabIndex={-1}
      //  className={className}
      ref={option?.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={'typeahead-item-' + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className="component-picker-menu-text-item-container"
    >
      <div className="component-picker-menu-text-item-container-icon">{icon}</div>
      <div className="component-picker-menu-text-item-container-text">
        <p>{text || option?.title}</p>
      </div>
    </div>
  )
}

function getDynamicOptions(editor: LexicalEditor, queryString: string) {
  const options: Array<ComponentPickerOption> = []

  if (queryString == null) {
    return options
  }

  const tableMatch = queryString.match(/^([1-9]\d?)(?:x([1-9]\d?)?)?$/)

  if (tableMatch !== null) {
    const rows = tableMatch[1]
    const colOptions = tableMatch[2] ? [tableMatch[2]] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(String)

    options.push(
      ...colOptions.map(
        (columns) =>
          new ComponentPickerOption(`${rows}x${columns} Table`, {
            icon: <i className="icon table" />,
            keywords: ['table'],
            onSelect: () =>
              editor.dispatchCommand(INSERT_TABLE_COMMAND, {
                columns: columns || '',
                rows: rows || '',
              }),
          })
      )
    )
  }

  return options
}

type ShowModal = ReturnType<typeof useModal>[1]

function getBaseOptions(editor: LexicalEditor, showModal: ShowModal) {
  return [
    new ComponentPickerOption('Paragraph', {
      icon: <i className="icon paragraph" />,
      keywords: ['normal', 'paragraph', 'p', 'text'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode())
          }
        }),
    }),
    ...([1, 2, 3] as const).map(
      (n) =>
        new ComponentPickerOption(`Heading ${n}`, {
          icon: <i className={`icon h${n}`} />,
          keywords: ['heading', 'header', `h${n}`],
          onSelect: () =>
            editor.update(() => {
              const selection = $getSelection()
              if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createHeadingNode(`h${n}`))
              }
            }),
        })
    ),
    new ComponentPickerOption('Table', {
      icon: <i className="icon table" />,
      keywords: ['table', 'grid', 'spreadsheet', 'rows', 'columns'],
      onSelect: () =>
        showModal('Insert Table', (onClose) => (
          <InsertTableDialog activeEditor={editor} onClose={onClose} />
        )),
    }),
    new ComponentPickerOption('Numbered List', {
      icon: <i className="icon number" />,
      keywords: ['numbered list', 'ordered list', 'ol'],
      onSelect: () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
    }),
    new ComponentPickerOption('Bulleted List', {
      icon: <i className="icon bullet" />,
      keywords: ['bulleted list', 'unordered list', 'ul'],
      onSelect: () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
    }),
    new ComponentPickerOption('Check List', {
      icon: <i className="icon check" />,
      keywords: ['check list', 'todo list'],
      onSelect: () => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
    }),
    new ComponentPickerOption('Quote', {
      icon: <i className="icon quote" />,
      keywords: ['block quote'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection()
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createQuoteNode())
          }
        }),
    }),
    new ComponentPickerOption('Code', {
      icon: <i className="icon code" />,
      keywords: ['javascript', 'python', 'js', 'codeblock'],
      onSelect: () =>
        editor.update(() => {
          const selection = $getSelection()

          if ($isRangeSelection(selection)) {
            if (selection.isCollapsed()) {
              $setBlocksType(selection, () => $createCodeNode())
            } else {
              // Will this ever happen?
              const textContent = selection.getTextContent()
              const codeNode = $createCodeNode()
              selection.insertNodes([codeNode])
              selection.insertRawText(textContent)
            }
          }
        }),
    }),
    new ComponentPickerOption('Divider', {
      icon: <i className="icon horizontal-rule" />,
      keywords: ['horizontal rule', 'divider', 'hr'],
      onSelect: () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
    }),
    new ComponentPickerOption('Page Break', {
      icon: <i className="icon page-break" />,
      keywords: ['page break', 'divider'],
      onSelect: () => editor.dispatchCommand(INSERT_PAGE_BREAK, undefined),
    }),
    new ComponentPickerOption('Excalidraw', {
      icon: <i className="icon diagram-2" />,
      keywords: ['excalidraw', 'diagram', 'drawing'],
      onSelect: () => editor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND, undefined),
    }),
    new ComponentPickerOption('Poll', {
      icon: <i className="icon poll" />,
      keywords: ['poll', 'vote'],
      onSelect: () =>
        showModal('Insert Poll', (onClose) => (
          <InsertPollDialog activeEditor={editor} onClose={onClose} />
        )),
    }),
    ...EmbedConfigs.map(
      (embedConfig) =>
        new ComponentPickerOption(`Embed ${embedConfig.contentName}`, {
          icon: embedConfig.icon || <></>,
          keywords: [...embedConfig.keywords, 'embed'],
          onSelect: () => editor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type),
        })
    ),
    new ComponentPickerOption('Equation', {
      icon: <i className="icon equation" />,
      keywords: ['equation', 'latex', 'math'],
      onSelect: () =>
        showModal('Insert Equation', (onClose) => (
          <InsertEquationDialog activeEditor={editor} onClose={onClose} />
        )),
    }),
    new ComponentPickerOption('GIF', {
      icon: <i className="icon gif" />,
      keywords: ['gif', 'animate', 'image', 'file'],
      onSelect: () =>
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
          altText: 'Cat typing on a laptop',
          src: catTypingGif,
        }),
    }),
    new ComponentPickerOption('Image', {
      icon: <i className="icon image" />,
      keywords: ['image', 'photo', 'picture', 'file'],
      onSelect: () =>
        showModal('Insert Image', (onClose) => (
          <InsertImageDialog activeEditor={editor} onClose={onClose} />
        )),
    }),
    new ComponentPickerOption('Collapsible', {
      icon: <i className="icon caret-right" />,
      keywords: ['collapse', 'collapsible', 'toggle'],
      onSelect: () => editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined),
    }),
    new ComponentPickerOption('Columns Layout', {
      icon: <i className="icon columns" />,
      keywords: ['columns', 'layout', 'grid'],
      onSelect: () =>
        showModal('Insert Columns Layout', (onClose) => (
          <InsertLayoutDialog activeEditor={editor} onClose={onClose} />
        )),
    }),
    ...(['left', 'center', 'right', 'justify'] as const).map(
      (alignment) =>
        new ComponentPickerOption(`Align ${alignment}`, {
          icon: <i className={`icon ${alignment}-align`} />,
          keywords: ['align', 'justify', alignment],
          onSelect: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment),
        })
    ),
  ]
}
//ICON
import { ReactComponent as NormalTextt } from '@src/modules/shared/assets/icons/editor/Text/Normal-text.svg'
import { ReactComponent as Heading1 } from '@src/modules/shared/assets/icons/editor/Text/Heading-1.svg'
import { ReactComponent as Heading2 } from '@src/modules/shared/assets/icons/editor/Text/Heading-2.svg'
import { ReactComponent as Heading3 } from '@src/modules/shared/assets/icons/editor/Text/Heading-3.svg'
import { ReactComponent as Quote } from '@src/modules/shared/assets/icons/editor/Text/Quote.svg'
import { ReactComponent as Checklist } from '@src/modules/shared/assets/icons/editor/Text/checklist.svg'
import { ReactComponent as NumberList } from '@src/modules/shared/assets/icons/editor/Text/number-list.svg'
import { ReactComponent as BulletedList } from '@src/modules/shared/assets/icons/editor/Text/bulleted-list.svg'
import { ReactComponent as CodeBlockIcon } from '@src/modules/shared/assets/icons/editor/Text/code-block.svg'

const ComponentPickerMenu = (
  options: Array<{
    title: string
    fields: {
      icon: JSX.Element
      text: string
      option: any
    }[]
  }>,
  selectedIndex: number | null,
  selectOptionAndCleanUp: (option: ComponentPickerOption) => void,
  setHighlightedIndex: (index: number) => void
) => {
  return (
    <div className="component-picker-menu">
      {options?.map((section, index) => (
        <div key={index}>
          <div className="component-picker-menu-header">{section?.title}</div>
          <div className="component-picker-menu-text">
            <div className="component-picker-menu-text-item">
              {section?.fields?.slice(0, 6)?.map((field, fieldIndex) => (
                <ComponentPickerMenuItem
                  index={fieldIndex}
                  icon={field?.icon}
                  text={field?.text}
                  isSelected={selectedIndex === fieldIndex}
                  onClick={() => {
                    setHighlightedIndex(fieldIndex)
                    selectOptionAndCleanUp(field?.option)
                  }}
                  onMouseEnter={() => {
                    setHighlightedIndex(fieldIndex)
                  }}
                  key={field?.option?.key}
                  option={field?.option}
                />
              ))}
            </div>
            <div className="component-picker-menu-text-item">
              {section?.fields?.slice(7)?.map((field, fieldIndex) => (
                <ComponentPickerMenuItem
                  index={fieldIndex}
                  icon={field?.icon}
                  isSelected={selectedIndex === fieldIndex}
                  onClick={() => {
                    setHighlightedIndex(fieldIndex)
                    selectOptionAndCleanUp(field?.option)
                  }}
                  onMouseEnter={() => {
                    setHighlightedIndex(fieldIndex)
                  }}
                  key={field?.option?.key}
                  option={field?.option}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ComponentPickerMenuPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext()
  const [modal, showModal] = useModal()
  const [queryString, setQueryString] = useState<string | null>(null)

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  })

  const options = useMemo(() => {
    const baseOptions = getBaseOptions(editor, showModal)

    if (!queryString) {
      return baseOptions
    }

    const regex = new RegExp(queryString, 'i')

    return [
      ...getDynamicOptions(editor, queryString),
      ...baseOptions.filter(
        (option) =>
          regex.test(option.title) || option.keywords.some((keyword) => regex.test(keyword))
      ),
    ]
  }, [editor, queryString, showModal])

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string
    ) => {
      editor.update(() => {
        nodeToRemove?.remove()
        selectedOption.onSelect(matchingString)
        closeMenu()
      })
    },
    [editor]
  )
  console.log(options, 'options')
  const componentPickerData = [
    {
      title: 'Text',
      fields: [
        {
          icon: <NormalTextt />,
          option: options.find((option) => option?.title === 'Paragraph'),
          text: 'Normal text',
        },
        {
          icon: <Heading1 />,
          option: options.find((option) => option?.title === 'Heading 1'),
          text: 'Heading 1',
        },
        {
          icon: <Heading2 />,
          option: options.find((option) => option?.title === 'Heading 2'),
          text: 'Heading 2',
        },
        {
          icon: <Heading3 />,
          option: options.find((option) => option?.title === 'Heading 3'),
          text: 'Heading 3',
        },
        // {
        //   icon: <Heading4 />,
        //   option:options.find(option => option?.title === 'Heading 4'),
        //   text: 'Heading 4',
        // },
        {
          icon: <Quote />,
          option: options.find((option) => option?.title === 'Quote'),
          text: 'Quote',
        },
        {
          icon: <BulletedList />,
          option: options.find((option) => option?.title === 'Bulleted List'),
          text: 'Bulleted List',
        },
        {
          icon: <NumberList />,
          option: options.find((option) => option?.title === 'Numbered List'),
          text: 'Numbered List',
        },
        //   {
        //     icon: <ToggleList />,
        //     option:options.find(option => option?.title === 'Toggle List'),
        //     text: 'Toggle List',
        //   },
        {
          icon: <Checklist />,
          option: options.find((option) => option?.title === 'Check List'),
          text: 'Checklist',
        },
        {
          icon: <CodeBlockIcon />,
          option: options.find((option) => option?.title === 'Code'),
          text: 'Code block',
        },
      ],
    },
  ]
  return (
    <>
      {modal}
      <LexicalTypeaheadMenuPlugin<ComponentPickerOption>
        onQueryChange={setQueryString}
        onSelectOption={onSelectOption}
        triggerFn={checkForTriggerMatch}
        options={options}
        menuRenderFn={(
          anchorElementRef,
          { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }
        ) =>
          anchorElementRef.current && options.length
            ? ReactDOM.createPortal(
                <div className="typeahead-popover component-picker-menu">
                  {/* Header */}
                  {ComponentPickerMenu(
                    componentPickerData,
                    selectedIndex,
                    selectOptionAndCleanUp,
                    setHighlightedIndex
                  )}
                  <ul>
                    {options?.map((option, i: number) => {
                      return (
                        <ComponentPickerMenuItem
                          index={i}
                          icon={
                            <span>
                              {option?.title?.split(' ')[0]?.[0]}
                              {option?.title?.split(' ')[1]?.[0]}
                            </span>
                          }
                          isSelected={selectedIndex === i}
                          onClick={() => {
                            setHighlightedIndex(i)
                            selectOptionAndCleanUp(option)
                          }}
                          onMouseEnter={() => {
                            setHighlightedIndex(i)
                          }}
                          key={option?.key}
                          option={option}
                        />
                      )
                    })}
                  </ul>
                </div>,
                anchorElementRef.current
              )
            : null
        }
      />
    </>
  )
}
