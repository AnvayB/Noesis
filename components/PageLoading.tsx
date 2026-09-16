// Shown immediately on navigation while a force-dynamic route's server
// component is still fetching — without this, a click into any page looks
// frozen for as long as that fetch takes, instead of showing that something
// is happening.
export function PageLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24" role="status" aria-label="Loading">
      <span className="lamp-dot" aria-hidden="true" />
    </div>
  );
}
