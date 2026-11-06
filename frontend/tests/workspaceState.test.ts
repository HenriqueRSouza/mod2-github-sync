import assert from 'node:assert/strict'
import test from 'node:test'

import { buildWorkspaceUrl, parseWorkspaceState } from '../src/workspaceState.ts'


test('workspace state accepts only known tabs and positive repository ids', () => {
  assert.deepEqual(parseWorkspaceState('?tab=webhooks&project=46d493f0-40c7-4f92-b13c-330dde429779&repo=42'), {
    tab: 'webhooks',
    projectId: '46d493f0-40c7-4f92-b13c-330dde429779',
    repositoryId: 42,
  })
  assert.deepEqual(parseWorkspaceState('?tab=unknown&project=invalid&repo=-1'), {
    tab: 'overview',
    projectId: null,
    repositoryId: null,
  })
})


test('workspace url persists the selected tab and repository', () => {
  assert.equal(
    buildWorkspaceUrl('analytics', '46d493f0-40c7-4f92-b13c-330dde429779', 7),
    '/app?tab=analytics&project=46d493f0-40c7-4f92-b13c-330dde429779&repo=7',
  )
  assert.equal(buildWorkspaceUrl('overview'), '/app?tab=overview')
})
