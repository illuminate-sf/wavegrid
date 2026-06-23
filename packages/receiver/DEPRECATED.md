# DEPRECATED

`wavegrid` (receiver) is deprecated and replaced by `@wavegrid/agent`.

The receiver's role — smoothing state and dispatching to hardware — is now handled by `@wavegrid/agent` which runs patterns locally in a QuickJS sandbox with host-side safety limiting and dispatches via `@wavegrid/osc`.
