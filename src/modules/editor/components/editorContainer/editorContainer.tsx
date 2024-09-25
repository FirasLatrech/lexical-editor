import { LexicalComposer } from '@lexical/react/LexicalComposer'
import theme from '../../themes/PlaygroundEditorTheme'

import PlaygroundNodes from '../../nodes/PlaygroundNodes'
import { SharedHistoryContext } from '../../context/SharedHistoryContext'
import { TableContext } from '../../plugins/TablePlugin/TablePlugin'
import { SharedAutocompleteContext } from '../../context/SharedAutocompleteContext'
import Editor from '../editor/editor'

export function EditorContainer() {
  const initialConfig = {
    namespace: 'Playground',
    editorState: null,
    nodes: [...PlaygroundNodes],

    onError: (error: Error) => {
      throw error
    },
    theme: theme,
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      {/* <Editor /> */}
      <SharedHistoryContext>
        <TableContext>
          <SharedAutocompleteContext>
            <div className="editor-shell">
              <Editor />
            </div>
            {/* {true ? <DocsPlugin /> : null}
            {true ? <PasteLogPlugin /> : null}
            {true ? <TestRecorderPlugin /> : null} */}
          </SharedAutocompleteContext>
        </TableContext>
      </SharedHistoryContext>
    </LexicalComposer>
  )
}
