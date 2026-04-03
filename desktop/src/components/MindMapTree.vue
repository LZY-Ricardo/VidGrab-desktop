<script setup lang="ts">
import { computed } from 'vue'

import type { MindMapNode } from '@/types'

interface LayoutNode {
  id: string
  label: string
  depth: number
  x: number
  y: number
  width: number
  height: number
  color: string
  children: LayoutNode[]
}

interface Link {
  id: string
  from: LayoutNode
  to: LayoutNode
  color: string
}

const props = defineProps<{
  node: MindMapNode
}>()

const BRANCH_COLORS = ['#2563eb', '#f97316', '#16a34a', '#a855f7', '#dc2626', '#0891b2']

const layout = computed(() => {
  let leafCursor = 0
  const nodes: LayoutNode[] = []
  const links: Link[] = []

  function build(current: MindMapNode, depth: number, color: string, index: number): LayoutNode {
    const branchColor = depth === 0 ? '#1d4ed8' : depth === 1 ? BRANCH_COLORS[index % BRANCH_COLORS.length] : color
    const width = Math.max(96, Math.min(240, current.label.length * 10 + 30))
    const height = 42
    const children = (current.children || []).map((child, childIndex) => build(child, depth + 1, branchColor, childIndex))

    let y = 0
    if (children.length === 0) {
      y = 40 + leafCursor * 72
      leafCursor += 1
    } else {
      y = children.reduce((sum, item) => sum + item.y, 0) / children.length
    }

    const node: LayoutNode = {
      id: current.id || `${depth}-${index}`,
      label: current.label,
      depth,
      x: 36 + depth * 240,
      y,
      width,
      height,
      color: branchColor,
      children,
    }
    nodes.push(node)

    for (const child of children) {
      links.push({ id: `${node.id}->${child.id}`, from: node, to: child, color: child.color })
    }

    return node
  }

  if (!props.node) {
    return { width: 900, height: 360, nodes, links }
  }

  build(props.node, 0, '#1d4ed8', 0)
  const width = Math.max(920, ...nodes.map((item) => item.x + item.width + 80))
  const height = Math.max(360, ...nodes.map((item) => item.y + item.height + 40))
  return { width, height, nodes, links }
})

function buildPath(link: Link) {
  const startX = link.from.x + link.from.width
  const startY = link.from.y + link.from.height / 2
  const endX = link.to.x
  const endY = link.to.y + link.to.height / 2
  const delta = endX - startX
  return `M ${startX} ${startY} C ${startX + delta * 0.35} ${startY}, ${startX + delta * 0.75} ${endY}, ${endX} ${endY}`
}
</script>

<template>
  <div class="canvas">
    <svg :viewBox="`0 0 ${layout.width} ${layout.height}`" :style="{ width: `${layout.width}px`, height: `${layout.height}px` }">
      <g>
        <path
          v-for="link in layout.links"
          :key="link.id"
          :d="buildPath(link)"
          fill="none"
          :stroke="link.color"
          stroke-width="2.2"
          stroke-linecap="round"
          opacity="0.88"
        />
      </g>
      <g
        v-for="node in layout.nodes"
        :key="node.id"
        :transform="`translate(${node.x}, ${node.y})`"
      >
        <rect
          :width="node.width"
          :height="node.height"
          rx="12"
          ry="12"
          fill="#ffffff"
          :stroke="node.depth === 0 ? '#1d4ed8' : '#cbd5e1'"
          :stroke-width="node.depth === 0 ? 1.8 : 1.2"
        />
        <text
          x="14"
          y="25"
          :fill="node.depth === 0 ? '#1d4ed8' : '#334155'"
          :font-size="node.depth === 0 ? 14 : 12.5"
          :font-weight="node.depth === 0 ? 700 : 500"
          font-family="Segoe UI, PingFang SC, sans-serif"
        >
          {{ node.label }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.canvas {
  min-height: 320px;
  overflow: auto;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
</style>
