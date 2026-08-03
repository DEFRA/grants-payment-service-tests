export function isEnvTrue(name, { defaultValue = false } = {}) {
  const raw = process.env[name]
  console.log(`ENV Var: ${name} = ${raw}`)
  if (raw == null || raw === '') return defaultValue
  return String(raw).trim().toLowerCase() === 'true'
}
