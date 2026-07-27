import type {
  OrganizationTreeNode,
} from "../types/organization-tree"


type Props = {
  nodes: OrganizationTreeNode[]
}


function Node({
  node,
  level = 0,
}: {
  node: OrganizationTreeNode
  level?: number
}) {
  const hasChildren =
    node.children.length > 0


  return (
    <div
      className="space-y-2"
      style={{
        marginLeft: level * 20,
      }}
    >

      <div className="flex items-center gap-2">

        <span className="text-sm text-muted-foreground">
          {node.type === "unit" && "🏢"}

          {node.type === "department" && "📂"}

          {node.type === "team" && "👥"}

          {node.type === "position" && "💼"}
        </span>


        <span className="font-medium">
          {node.name}
        </span>


        {node.metadata?.hierarchicalLevel && (
          <span className="text-xs text-muted-foreground">
            ({node.metadata.hierarchicalLevel})
          </span>
        )}

      </div>


      {hasChildren && (
        <div className="space-y-2 border-l pl-4">

          {node.children.map(
            (child) => (
              <Node
                key={child.id}
                node={child}
                level={level + 1}
              />
            )
          )}

        </div>
      )}

    </div>
  )
}


export function OrganizationTree({
  nodes,
}: Props) {

  return (
    <section className="rounded-2xl border bg-card p-6">

      <div className="mb-5">

        <h2 className="text-xl font-semibold">
          Organograma
        </h2>

        <p className="text-sm text-muted-foreground">
          Estrutura organizacional atual da empresa.
        </p>

      </div>


      <div className="space-y-4">

        {nodes.map(
          (node) => (
            <Node
              key={node.id}
              node={node}
            />
          )
        )}

      </div>

    </section>
  )
}
