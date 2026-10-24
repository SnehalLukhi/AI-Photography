import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Loads data when a page opens (and again when `deps` change). Returns { data, loading, error, reload, setData }.
 * A newer request always wins over an older one that is still on its way.
 */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const seq = useRef(0)
  const run = useCallback(() => {
    const id = ++seq.current
    setState((s) => ({ ...s, loading: true, error: '' }))
    Promise.resolve(fn()).then(
      (data) => { if (id === seq.current) setState({ data, loading: false, error: '' }) },
      (e) => { if (id === seq.current) setState((s) => ({ ...s, loading: false, error: e.message || 'Something went wrong.' })) },
    )
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, [run])
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) }
}
