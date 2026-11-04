# SSF Grammar Reference

Simple State Form (SSF) is the state notation for concept design specs. It is designed to be readable by both technical and non-technical audiences, and maps cleanly to relational databases, document stores, and graph databases.

---

## Full Grammar

```
schema       ::= ( set-decl | subset-decl )*

set-decl     ::= ["a" | "an"] ("element" | "set") ["of"] object-type ["with" field-decl+]

subset-decl  ::= ["a" | "an"] sub-type ("element" | "set") ["of"] (object-type | sub-type) ["with" field-decl+]

field-decl   ::= ["a" | "an"] ["optional"] [field-name] (scalar-type | set-type)

scalar-type  ::= object-type | parameter-type | enumeration-type | primitive-type

set-type     ::= ("set" | "seq") ["of"] scalar-type

enum-type    ::= "of" (CONSTANT "or")+ CONSTANT
```

**Conventions:**
- Type names start with uppercase: `User`, `Item`
- Field names start with lowercase: `email`, `createdAt`
- Enum constants are ALL_CAPS: `ACTIVE`, `PENDING`
- Whitespace-sensitive: each declaration on its own line; field declarations indented under their set
- Types may be pluralized: `a set of Strings` = `a set of String`

---

## Primitives

| Type | Use for |
|------|---------|
| `String` | Text values |
| `Number` | Integers and decimals |
| `Flag` | Boolean true/false |
| `Date` | Calendar date (no time) |
| `DateTime` | Date + time |

---

## Examples by Pattern

### Basic set with scalar fields
```
a set of Users with
  an email String
  a password String
  an isActive Flag
  a createdAt DateTime
```

### Set with optional field
```
a set of Events with
  a title String
  a startDate Date
  an optional endDate Date
```

### Set with enumerated field
```
a set of Tasks with
  a title String
  a status of PENDING or IN_PROGRESS or DONE or CANCELLED
```

### Set with set-valued field
```
a set of Posts with
  a content String
  a tags set of String
  a coauthors set of User
```

### Set with ordered field
```
a set of Playlists with
  a name String
  a tracks seq of Track
```

### Subset (extends an existing set with additional fields)
```
a set of Users with
  an email String

a BannedUsers set of Users with
  a bannedAt DateTime
  a bannedBy User
  a reason String
```
A BannedUser is still a User — it just also belongs to the BannedUsers subset. Adding to a subset takes an existing object; it doesn't create a new one.

### Subset with no extra fields (classification only)
```
a set of Users with
  an email String

a Moderators set of Users
```

### Relation defined as a subset
Prefer subset style when a relation would clutter the base set or only applies to some members:
```
a set of Users with
  a username String

a Following set of Users with
  a follows set of Users
```
This says: some users are "following users" and each has a set of users they follow.

### Singleton (exactly one instance)
```
an element AppConfig with
  a maintenanceMode Flag
  an appName String
  an apiKey String
```

### Implicit field name
When a field's name would equal its type name (lowercased), you can omit the name:
```
a set of Comments with
  a User          ← equivalent to: a user User
  a set of Tags   ← equivalent to: a tags set of Tag
```

### Multiple declarations for the same type
Two separate set-decls for the same type are valid — each adds relations to that type. This is common in concept design when the same entity appears in two different concepts:
```
── in the User concept ──
a set of Users with
  an email String
  a passwordHash String

── in the Profile concept ──
a set of Users with
  a displayName String
  an avatarUrl String
```
The relational view treats each as additional columns on the same Users table.

---

## Two Views of a Declaration

```
a set of Users with
  a username String
  a password String
```

**Collection view** (intuitive): A collection of user objects, each having a username and password.

**Relational view** (precise): A set of identifiers `{u1, u2, ...}` plus two relations: `username: User → String` and `password: User → String`.

The relational view clarifies:
- Objects don't "own" their fields — fields are just relations
- The same identifier can appear in multiple sets and subsets
- Navigation direction is not implied by declaration order

---

## Multiplicity Conventions

| Declaration | Multiplicity |
|-------------|--------------|
| `a fieldName Type` | Exactly one value (required scalar) |
| `an optional fieldName Type` | Zero or one value |
| `a fieldName set of Type` | Zero or more values (unordered) |
| `a fieldName seq of Type` | Zero or more values (ordered) |

A field declared as `set` or `seq` is never declared `optional` — an empty set represents the no-value case.

---

## What SSF Does Not Express

SSF intentionally omits:
- **Navigation hints**: `a set of Users with a Group` does not imply you iterate Users to find members of a Group. Both directions can be supported; declare whichever reflects the multiplicity constraint you want to enforce.
- **Invariants**: Cross-field constraints (e.g., `endDate >= startDate`) must be noted informally in the concept description.
- **Indexes or performance hints**: Those belong in implementation, not spec.
- **Union types**: Not currently supported. Use a subset pattern instead.
