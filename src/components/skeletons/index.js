/**
 * Loading placeholders.
 *
 * Two layers: primitives and shapes you can compose anywhere (SkeletonBlock,
 * TableSkeleton, StatCardsSkeleton…), and whole-page skeletons for the routes
 * whose AsyncState wraps the entire body.
 *
 * Every shape mirrors the real markup's spacing and grid tracks, so the page
 * does not jump when the data arrives. Pass one to AsyncState's `skeleton`
 * slot:
 *
 *   <AsyncState :loading="loading" :error="error" @retry="refresh">
 *     <template #skeleton><DashboardSkeleton /></template>
 *     …
 *   </AsyncState>
 */

export { default as SkeletonBlock } from './SkeletonBlock.vue'
export { default as SkeletonText } from './SkeletonText.vue'

export { default as AccountCardsSkeleton } from './AccountCardsSkeleton.vue'
export { default as CardSkeleton } from './CardSkeleton.vue'
export { default as ChartSkeleton } from './ChartSkeleton.vue'
export { default as LegendListSkeleton } from './LegendListSkeleton.vue'
export { default as MeterListSkeleton } from './MeterListSkeleton.vue'
export { default as StatCardsSkeleton } from './StatCardsSkeleton.vue'
export { default as TableCardSkeleton } from './TableCardSkeleton.vue'
export { default as TableSkeleton } from './TableSkeleton.vue'

export { default as DashboardSkeleton } from './DashboardSkeleton.vue'
export { default as PayrollSkeleton } from './PayrollSkeleton.vue'
export { default as ReportsSkeleton } from './ReportsSkeleton.vue'
export { default as SettingsSkeleton } from './SettingsSkeleton.vue'
