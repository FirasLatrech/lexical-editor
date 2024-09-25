import sharedRoutes from './sharedRoutes'
import authRoutes from '../../auth/routes/routes'
import dashboardRoutes from '../../dashboard/routes/routes'
import editorRoutes from '../../editor/routes/routes'
const routes = [...sharedRoutes, ...authRoutes, ...dashboardRoutes, ...editorRoutes]

export default routes
