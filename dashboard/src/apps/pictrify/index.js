import Overview from './pages/Overview.jsx'
import Users from './pages/Users.jsx'
import Subscriptions from './pages/Subscriptions.jsx'
import Categories from './pages/Categories.jsx'
import Templates from './pages/Templates.jsx'
import Trending from './pages/Trending.jsx'
import ApiUsage from './pages/ApiUsage.jsx'
import Admins from './pages/Admins.jsx'

/** Pictrify (AI photo generator). Its backend serves everything under /api/admin with the x-admin-key header. */
export default {
  id: 'pictrify',
  name: 'Pictrify',
  tagline: 'AI photo generator',
  accent: '#FF5CA8',
  apiUrl: import.meta.env.VITE_PICTRIFY_API || 'http://localhost:5001', // where the app's API is (set VITE_PICTRIFY_API when you build for production)
  loginPath: '/api/admin/login', // POST { username, password } -> { token, username, expiresAt, app }
  nav: [
    { group: 'Insights', pages: [
      { id: 'overview', label: 'Overview', icon: 'home', component: Overview },
      { id: 'users', label: 'Users', icon: 'users', component: Users },
      { id: 'subscriptions', label: 'Subscriptions', icon: 'card', component: Subscriptions },
      { id: 'api-usage', label: 'API usage', icon: 'bolt', component: ApiUsage },
    ] },
    { group: 'Catalogue', pages: [
      { id: 'categories', label: 'Categories', icon: 'folder', component: Categories },
      { id: 'templates', label: 'Templates', icon: 'image', component: Templates },
      { id: 'trending', label: 'Trending', icon: 'flame', component: Trending },
    ] },
    { group: 'Settings', pages: [
      { id: 'admins', label: 'Admins', icon: 'lock', component: Admins },
    ] },
  ],
}
