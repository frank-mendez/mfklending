export interface ActionState {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  data?: unknown
}

export function actionSuccess(message: string, data?: unknown): ActionState {
  return { success: true, message, data }
}

export function actionError(message: string, errors?: Record<string, string[]>): ActionState {
  return { success: false, message, errors }
}
