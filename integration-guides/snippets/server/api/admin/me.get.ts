import { requireAdminUser } from '~~/server/utils/requireAdminUser'

export default defineEventHandler(async (event) => {
  const ctx = await requireAdminUser(event)
  return { user: ctx.user, via: ctx.via }
})
