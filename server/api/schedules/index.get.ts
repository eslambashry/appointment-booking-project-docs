import { Schedule } from '../../models/Schedule'

// GET /api/schedules — schedules belonging to the authenticated owner.
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  return await Schedule.find({ ownerId: user._id }).sort({ createdAt: -1 })
})
