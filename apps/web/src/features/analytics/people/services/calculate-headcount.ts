type EmployeeStatus = {
  status: string
}

export function calculateHeadcount(
  employees: readonly EmployeeStatus[]
) {
  return employees.filter(
    (employee) => employee.status === "active"
  ).length
}
