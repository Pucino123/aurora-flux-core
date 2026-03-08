
## Fix: Profile Picture Upload Fails

### Root Cause
The `document-images` storage bucket has an RLS policy requiring the **first folder in the path to equal the user's ID**:
```
(storage.foldername(name))[1] = auth.uid()::text
```

The upload path in `FluxSidebar.tsx` line 41 is:
```
avatars/${user.id}.${ext}   ← first folder is "avatars", not the user ID → BLOCKED
```

### Fix
Change the upload path from `avatars/${user.id}.${ext}` to `${user.id}/avatar.${ext}` so the first folder equals the user's ID, satisfying the existing RLS policy.

One-line change in `src/components/FluxSidebar.tsx` line 41.
