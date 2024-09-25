import { EditorContainer } from '../components/editorContainer/editorContainer'

const AppEditor = () => {
  // rtk query example
  //   const { data: users, isLoading, isError, isSuccess } = useGetUsersQuery({ page: 1, limit: 10 })
  //   const { data: user } = useGetOneUserQuery('hazem')
  //   const [updateUser] = useUpdateUserMutation()
  //   console.log(updateUser)

  //   console.log({ users, user, isLoading, isError, isSuccess })

  return (
    <div className="editor">
      <div className="Softy-editor">SOFTY EDITOR</div>
      <EditorContainer />
    </div>
  )
}

export default AppEditor
