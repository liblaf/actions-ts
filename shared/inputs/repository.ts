export function splitOwnerRepo(full_name: string): [string, string] {
  const [owner, repo] = full_name.split("/");
  return [owner!, repo!];
}
