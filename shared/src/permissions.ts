function crud(modules: string[]) {
  return modules.flatMap((module) => [`can-view-${module}`, `can-create-${module}`, `can-update-${module}`, `can-delete-${module}`])
}

export const teacherPermissions = [
  ...crud(["courses", "chapters", "lessons", "summaries", "exams", "questions", "groups", "classrooms", "sessions", "codes", "meetings", "employees"]),
  "can-view-students",
  "can-view-reports",
  "can-view-plans",
  "can-view-subscriptions",
  "can-create-subscriptions",
  "can-format-course",
  "can-format-summary",
  "can-correct-exams",
  "can-manage-meeting",
]

export const institutePermissions = [
  ...crud(["teachers", "courses", "chapters", "lessons", "summaries", "students", "employees", "schools", "exams", "questions", "advertisements", "codes", "sessions", "classrooms", "faq"]),
  "can-view-reports",
  "can-view-plans",
  "can-view-subscriptions",
  "can-create-subscriptions",
  "can-view-hour-pool",
  "can-view-meetings",
  "can-format-course",
  "can-format-summary",
  "can-correct-exams",
  "can-manage-meeting",
]
