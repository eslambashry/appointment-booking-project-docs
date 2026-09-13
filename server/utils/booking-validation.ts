import { z } from 'zod'

export const bookingRequestSchema = z.object({
  startAt: z.string().trim().min(1, 'Select a time'),
  customerName: z.string().trim().min(1, 'Name is required').max(120),
  customerEmail: z.string().trim().toLowerCase().email('Enter a valid email address'),
  customerPhone: z.string().trim().max(40).optional(),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    answer: z.string().trim().max(2000)
  })).default([])
})

export interface ScheduleQuestionLike {
  _id: unknown
  label: string
  required: boolean
}

// The client never sends prose answers matched to arbitrary labels — it sends
// {questionId, answer} pairs keyed to the schedule's own question ids (as
// returned by GET /api/public/:ownerSlug/:scheduleSlug), and the server looks
// up each question's real label/required flag itself. This is the same
// "never trust client-provided business values" rule (CLAUDE.md §12) applied
// to form questions, not just prices/ownership.
export function matchAnswers(
  questions: ScheduleQuestionLike[],
  submitted: { questionId: string, answer: string }[]
): { question: string, answer: string }[] {
  const submittedById = new Map(submitted.map((entry) => [entry.questionId, entry.answer]))

  for (const question of questions) {
    if (!question.required) continue
    const answer = submittedById.get(String(question._id))
    if (!answer || answer.trim().length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: `"${question.label}" is required.`
      })
    }
  }

  return questions
    .map((question) => ({
      question: question.label,
      answer: submittedById.get(String(question._id))?.trim() ?? ''
    }))
    .filter((entry) => entry.answer.length > 0)
}
