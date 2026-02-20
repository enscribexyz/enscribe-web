import React from 'react'

export function ExpiryBadge({ expiryDate }: { expiryDate: number }) {
  const now = new Date()
  const expiry = new Date(expiryDate * 1000)
  const threeMonthsFromNow = new Date()
  threeMonthsFromNow.setMonth(now.getMonth() + 3)

  const isExpired = expiry < now
  const isWithinThreeMonths = !isExpired && expiry < threeMonthsFromNow
  const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000
  const isInGracePeriod =
    isExpired && now.getTime() - expiry.getTime() < ninetyDaysInMs

  let textColorClass = 'text-green-600 dark:text-green-400'
  if (isWithinThreeMonths) {
    textColorClass = 'text-yellow-600 dark:text-yellow-400'
  } else if (isExpired && isInGracePeriod) {
    textColorClass = 'text-red-600 dark:text-red-400'
  } else if (isExpired) {
    textColorClass = 'text-red-600 dark:text-red-400'
  }

  return (
    <span className={`text-xs whitespace-nowrap ${textColorClass}`}>
      {isExpired ? 'Expired' : 'Expires'}: {expiry.toLocaleDateString()}
    </span>
  )
}
