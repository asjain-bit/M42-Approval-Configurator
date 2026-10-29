'use client'

import { Suspense, use } from 'react'
import { StageBuilder } from '@/components/builder/StageBuilder'

export default function StagePage({ params }: { params: Promise<{ workflowId: string; stageId: string }> }) {
  const { workflowId, stageId } = use(params)
  return (
    <Suspense>
      <StageBuilder workflowId={workflowId} stageId={stageId} />
    </Suspense>
  )
}
