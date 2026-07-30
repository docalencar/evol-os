export function PublicationResult({ success, message }: { success: boolean; message: string }) {
  return <div role="status" className={`rounded-lg p-4 text-sm ${success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}><strong>{success ? "Publicação concluída" : "Publicação não realizada"}</strong><p className="mt-1">{message}</p></div>
}
