const env = require('../config/env')
const admin = require('../services/admin.service')
const apiusage = require('../services/apiusage.service')
const adminAuth = require('../services/adminAuth.service')

/** POST /api/admin/login { username, password } -> { token, username, expiresAt, app }. The token goes in `Authorization: Bearer <token>` on every other admin call. */
const login = async (req, res) => res.set('Cache-Control', 'no-store').json({ success: true, app: env.brandName, ...(await adminAuth.login(req.body?.username, req.body?.password)) })

/** GET /api/admin/admins - the people who can sign in to the dashboard. */
const admins = async (req, res) => res.set('Cache-Control', 'no-store').json({ success: true, you: req.admin.id, admins: await adminAuth.list() })
/** POST /api/admin/admins { username, password } - creates an admin (the very first one with the x-admin-key header). */
const createAdmin = async (req, res) => res.status(201).json({ success: true, admin: await adminAuth.create(req.body?.username, req.body?.password) })
/** PUT /api/admin/admins/:id { password?, active? } - new password and / or switch off or on; ends that admin's sessions. */
const updateAdmin = async (req, res) => res.json({ success: true, admin: await adminAuth.update(req.params.id, { password: req.body?.password, active: req.body?.active }, req.admin.id) })
/** DELETE /api/admin/admins/:id */
const deleteAdmin = async (req, res) => { await adminAuth.remove(req.params.id, req.admin.id); res.json({ success: true, id: req.params.id }) }

/** GET /api/admin/ping - checks the admin key and tells the dashboard which app it is connected to. */
const ping = (req, res) => res.set('Cache-Control', 'no-store').json({ success: true, app: env.brandName, admin: req.admin.username })
/** GET /api/admin/stats - users joined, subscribers per plan, revenue, catalogue and generation counts. */
const stats = async (req, res) => res.set('Cache-Control', 'no-store').json({ success: true, ...(await admin.stats()) })
/** GET /api/admin/users?q=&page=&limit= */
const users = async (req, res) => res.set('Cache-Control', 'no-store').json({ success: true, ...(await admin.listUsers(req.query)) })
/** GET /api/admin/subscriptions?status=current|active|cancelled|...&q=&page=&limit= */
const subscriptions = async (req, res) => res.set('Cache-Control', 'no-store').json({ success: true, ...(await admin.listSubscriptions(req.query)) })

/** GET /api/admin/api-usage?days=30&api=&status=&page=&limit= - calls to the image provider: totals, per API, per day, errors and the latest calls with their result image. */
const apiUsage = async (req, res) => res.set('Cache-Control', 'no-store').json({ success: true, ...(await apiusage.usage(req.query)) })

module.exports = { login, admins, createAdmin, updateAdmin, deleteAdmin, ping, stats, users, subscriptions, apiUsage }
