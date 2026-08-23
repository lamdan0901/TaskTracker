Here is a comprehensive reference mapping popular **Data Structures**, **LINQ/Collection methods**, **String operations**, **Async patterns**, and **Language Features** between **C# (.NET)** and **JavaScript / TypeScript**.

---

## 1. Data Structures & Collections

| Data Structure / Concept | C# (.NET)                                     | TypeScript / JavaScript                        | Notes & Differences                                                                                |
| :----------------------- | :-------------------------------------------- | :--------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **Fixed-size Array**     | `int[] arr = new int[5];`                     | `const arr = new Array<number>(5);`            | JS arrays are always dynamic under the hood, but `TypedArray` (e.g., `Int32Array`) has fixed size. |
| **Dynamic Array / List** | `List<T>`                                     | `Array<T>` / `T[]`                             | JS arrays behave like `List<T>`.                                                                   |
| **Hash Map / Key-Value** | `Dictionary<TKey, TValue>`                    | `Map<K, V>` or `Record<K, V>` / `{}`           | `Map` supports any key type (including objects); plain `{}` only supports string/symbol keys.      |
| **Unique Set**           | `HashSet<T>`                                  | `Set<T>`                                       | Preserves insertion order in JS. In C#, `HashSet<T>` is unordered.                                 |
| **Queue (FIFO)**         | `Queue<T>` (`Enqueue`, `Dequeue`)             | `Array<T>` (`push`, `shift`)                   | For high throughput in JS, a custom linked queue avoids `shift()` $O(n)$ re-indexing.              |
| **Stack (LIFO)**         | `Stack<T>` (`Push`, `Pop`)                    | `Array<T>` (`push`, `pop`)                     | $O(1)$ operations in both.                                                                         |
| **Tuple / Pair**         | `(int Id, string Name)` / `Tuple<T1, T2>`     | `[number, string]` (TS Tuple)                  | TS tuples are typed arrays e.g., `const pair: [number, string] = [1, "test"];`.                    |
| **Read-Only List**       | `IReadOnlyList<T>` / `ReadOnlyCollection<T>`  | `readonly T[]` / `ReadonlyArray<T>`            | TS provides compile-time immutability; `Object.freeze(arr)` prevents runtime mutation.             |
| **Read-Only Dictionary** | `IReadOnlyDictionary<K, V>`                   | `ReadonlyMap<K, V>` / `Readonly<Record<K, V>>` | Compile-time immutability in TypeScript.                                                           |
| **Linked List**          | `LinkedList<T>`                               | Custom class / external package                | Rarely used in JS; arrays cover most use cases.                                                    |
| **Sorted Dictionary**    | `SortedDictionary<K, V>` / `SortedList<K, V>` | Custom / Tree-based library                    | JS `Map` iterates in insertion order, not sorted order.                                            |

---

## 2. Collection Operations: LINQ vs. JavaScript Array Methods

| Operation                        | C# LINQ (`System.Linq`)                     | JavaScript / TypeScript                                               |
| :------------------------------- | :------------------------------------------ | :-------------------------------------------------------------------- |
| **Filter / Where**               | `list.Where(x => x.IsActive)`               | `list.filter(x => x.isActive)`                                        |
| **Transform / Map**              | `list.Select(x => x.Name)`                  | `list.map(x => x.name)`                                               |
| **Flatten / FlatMap**            | `list.SelectMany(x => x.Items)`             | `list.flatMap(x => x.items)`                                          |
| **Find First (Throw if empty)**  | `list.First(x => x.Id == id)`               | `list.find(x => x.id === id)!` _(or throw manually)_                  |
| **Find First (Safe / Nullable)** | `list.FirstOrDefault(x => x.Id == id)`      | `list.find(x => x.id === id)` _(returns `undefined` if missing)_      |
| **Find Index**                   | `list.FindIndex(x => x.Id == id)`           | `list.findIndex(x => x.id === id)`                                    |
| **Any / Exists**                 | `list.Any(x => x.Age > 18)`                 | `list.some(x => x.age > 18)`                                          |
| **Has Elements**                 | `list.Any()`                                | `list.length > 0`                                                     |
| **All / Every**                  | `list.All(x => x.Age >= 18)`                | `list.every(x => x.age >= 18)`                                        |
| **Contains Element**             | `list.Contains(item)`                       | `list.includes(item)`                                                 |
| **Count Matching**               | `list.Count(x => x.Age > 18)`               | `list.filter(x => x.age > 18).length`                                 |
| **Aggregate / Reduce**           | `list.Aggregate(0, (acc, x) => acc + x)`    | `list.reduce((acc, x) => acc + x, 0)`                                 |
| **Sum**                          | `list.Sum(x => x.Price)`                    | `list.reduce((sum, x) => sum + x.price, 0)`                           |
| **Min / Max**                    | `list.Min(x => x.Price)` / `list.Max(...)`  | `Math.min(...list.map(x => x.price))`                                 |
| **Sort Ascending**               | `list.OrderBy(x => x.Name)`                 | `list.toSorted((a, b) => a.name.localeCompare(b.name))`               |
| **Sort Descending**              | `list.OrderByDescending(x => x.Age)`        | `list.toSorted((a, b) => b.age - a.age)`                              |
| **Secondary Sort**               | `list.OrderBy(x => x.A).ThenBy(x => x.B)`   | `list.toSorted((a, b) => a.a - b.a \|\| a.b - b.b)`                   |
| **Take N items**                 | `list.Take(5)`                              | `list.slice(0, 5)`                                                    |
| **Skip N items**                 | `list.Skip(5)`                              | `list.slice(5)`                                                       |
| **Distinct items**               | `list.Distinct()`                           | `[...new Set(list)]`                                                  |
| **Distinct by key**              | `list.DistinctBy(x => x.Id)`                | `Array.from(new Map(list.map(x => [x.id, x])).values())`              |
| **Group By**                     | `list.GroupBy(x => x.Category)`             | `Object.groupBy(list, x => x.category)` _(ES2024)_                    |
| **Map to Dictionary**            | `list.ToDictionary(x => x.Id, x => x.Name)` | `Object.fromEntries(list.map(x => [x.id, x.name]))` or `new Map(...)` |
| **Combine / Zip**                | `a.Zip(b, (x, y) => (${x}, ${y}))`          | `a.map((x, i) => [x, b[i]])`                                          |
| **Slice range**                  | `list.Take(10).Skip(5)` / `list[5..10]`     | `list.slice(5, 10)`                                                   |
| **Append / Prepend**             | `list.Append(item)` / `list.Prepend(item)`  | `[...list, item]` / `[item, ...list]`                                 |

> [!NOTE]
> C# LINQ uses **deferred / lazy execution** (`IEnumerable<T>`), whereas standard JS Array methods (`map`, `filter`) evaluate **eagerly** and allocate intermediate arrays. In JS, for lazy streams, use Generators (`function*`) or libraries like `iter-tools`.

---

## 3. String Methods

| Operation                   | C# (.NET)                                               | JavaScript / TypeScript                                                                                               |
| :-------------------------- | :------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| **Interpolation**           | `$"Hello {name}, count: {n}"`                           | `` `Hello ${name}, count: ${n}` ``                                                                                    |
| **Null/Empty check**        | `string.IsNullOrEmpty(str)`                             | `!str` _(covers `null`, `undefined`, `""`)_                                                                           |
| **Null/Whitespace check**   | `string.IsNullOrWhiteSpace(str)`                        | `!str?.trim()`                                                                                                        |
| **Contains substring**      | `str.Contains("abc")`                                   | `str.includes("abc")`                                                                                                 |
| **Starts with / Ends with** | `str.StartsWith("a")` / `str.EndsWith("z")`             | `str.startsWith("a")` / `str.endsWith("z")`                                                                           |
| **Substring / Slice**       | `str.Substring(0, 5)`                                   | `str.slice(0, 5)` / `str.substring(0, 5)`                                                                             |
| **Replace all**             | `str.Replace("a", "b")`                                 | `str.replaceAll("a", "b")`                                                                                            |
| **Split**                   | `str.Split(',')`                                        | `str.split(',')`                                                                                                      |
| **Join**                    | `string.Join(", ", list)`                               | `list.join(", ")`                                                                                                     |
| **Trim**                    | `str.Trim()` / `str.TrimStart()` / `str.TrimEnd()`      | `str.trim()` / `str.trimStart()` / `str.trimEnd()`                                                                    |
| **Case conversion**         | `str.ToLower()` / `str.ToUpper()`                       | `str.toLowerCase()` / `str.toUpperCase()`                                                                             |
| **Padding**                 | `str.PadLeft(5, '0')` / `str.PadRight(5, ' ')`          | `str.padStart(5, "0")` / `str.padEnd(5, " ")`                                                                         |
| **Case-insensitive match**  | `str.Equals(other, StringComparison.OrdinalIgnoreCase)` | `str.localeCompare(other, undefined, { sensitivity: 'accent' }) === 0` or `str.toLowerCase() === other.toLowerCase()` |

---

## 4. Dictionary / Map / Object Operations

| Operation               | C# `Dictionary<TKey, TValue>`              | JS `Map<K, V>`                            | JS Plain Object (`Record<string, V>`)    |
| :---------------------- | :----------------------------------------- | :---------------------------------------- | :--------------------------------------- |
| **Add / Set**           | `dict.Add(key, val);` / `dict[key] = val;` | `map.set(key, val);`                      | `obj[key] = val;`                        |
| **Get value**           | `dict[key]`                                | `map.get(key)`                            | `obj[key]`                               |
| **Safe Get / Check**    | `dict.TryGetValue(key, out var val)`       | `map.has(key) ? map.get(key) : undefined` | `key in obj ? obj[key] : undefined`      |
| **Contains Key**        | `dict.ContainsKey(key)`                    | `map.has(key)`                            | `key in obj` / `Object.hasOwn(obj, key)` |
| **Contains Value**      | `dict.ContainsValue(val)`                  | `[...map.values()].includes(val)`         | `Object.values(obj).includes(val)`       |
| **Remove / Delete**     | `dict.Remove(key)`                         | `map.delete(key)`                         | `delete obj[key]`                        |
| **Clear all**           | `dict.Clear()`                             | `map.clear()`                             | `for (const k in obj) delete obj[k];`    |
| **Get all keys**        | `dict.Keys`                                | `Array.from(map.keys())`                  | `Object.keys(obj)`                       |
| **Get all values**      | `dict.Values`                              | `Array.from(map.values())`                | `Object.values(obj)`                     |
| **Get key-value pairs** | `dict.ToList()` (`KeyValuePair<K,V>`)      | `Array.from(map.entries())`               | `Object.entries(obj)`                    |

---

## 5. Asynchronous Programming (Tasks vs. Promises)

| Concept                            | C# (.NET)                                       | JavaScript / TypeScript                                    |
| :--------------------------------- | :---------------------------------------------- | :--------------------------------------------------------- |
| **Async return type (no value)**   | `Task`                                          | `Promise<void>`                                            |
| **Async return type (with value)** | `Task<T>`                                       | `Promise<T>`                                               |
| **Keywords**                       | `async` / `await`                               | `async` / `await`                                          |
| **Wait for all (Parallel)**        | `await Task.WhenAll(task1, task2);`             | `await Promise.all([task1, task2]);`                       |
| **Wait for all (Safe settle)**     | Custom / AggregateException inspection          | `await Promise.allSettled([task1, task2]);`                |
| **Wait for first to complete**     | `await Task.WhenAny(task1, task2);`             | `await Promise.race([task1, task2]);` / `Promise.any(...)` |
| **Create resolved promise**        | `Task.FromResult(value)`                        | `Promise.resolve(value)`                                   |
| **Create rejected promise**        | `Task.FromException(ex)`                        | `Promise.reject(error)`                                    |
| **Delay / Sleep**                  | `await Task.Delay(1000);`                       | `await new Promise(res => setTimeout(res, 1000));`         |
| **Cancellation mechanism**         | `CancellationTokenSource` / `CancellationToken` | `AbortController` / `AbortSignal`                          |

---

## 6. Language Idioms & Operators

| Feature                                  | C#                                            | TypeScript / JavaScript                                                | Notes                                                          |
| :--------------------------------------- | :-------------------------------------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------- |
| **Null-conditional / Optional chaining** | `user?.Address?.City`                         | `user?.address?.city`                                                  | Identical syntax                                               |
| **Null-coalescing**                      | `name ?? "Default"`                           | `name ?? "Default"`                                                    | `??` avoids fallback on `0` or `false`                         |
| **Null-coalescing assignment**           | `name ??= "Default";`                         | `name ??= "Default";`                                                  | Identical syntax                                               |
| **Type Check**                           | `obj is string s`                             | `typeof obj === 'string'` / `obj instanceof MyClass`                   | TS uses User-Defined Type Guards (`val is Type`)               |
| **Type Cast**                            | `(TargetType)obj` or `obj as TargetType`      | `obj as TargetType` or `<TargetType>obj`                               | In TS, type assertions do not perform runtime conversions      |
| **Object Spread / Clone**                | Record `with { Age = 30 }` or MemberwiseClone | `{ ...user, age: 30 }` / `structuredClone(obj)`                        | Shallow clone with spread, deep clone with `structuredClone`   |
| **Destructuring**                        | Deconstruct: `var (id, name) = user;`         | `const { id, name } = user;` / `const [a, b] = arr;`                   |
| **Resource Disposal**                    | `using var file = File.Open(...);`            | `using file = openFile(...);` _(TS 5.2+ Explicit Resource Management)_ | TS 5.2 implements `Symbol.dispose` equivalent to `IDisposable` |
| **Error Handling**                       | `try { ... } catch (Exception ex) { ... }`    | `try { ... } catch (error) { ... }`                                    | In TS/JS, anything can be thrown (`catch (error: unknown)`)    |

---

## Quick Example: Typical Backend Pattern Comparison

### C#

```csharp
public record UserDto(int Id, string Name, int Age, bool IsActive);

var activeAdultNames = users
    .Where(u => u.IsActive && u.Age >= 18)
    .OrderBy(u => u.Name)
    .Select(u => u.Name)
    .ToList();

var userLookup = users.ToDictionary(u => u.Id, u => u);
```

### TypeScript

```typescript
interface UserDto {
  id: number;
  name: string;
  age: number;
  isActive: boolean;
}

const activeAdultNames = users
  .filter((u) => u.isActive && u.age >= 18)
  .toSorted((a, b) => a.name.localeCompare(b.name))
  .map((u) => u.name);

const userLookup = new Map(users.map((u) => [u.id, u]));
// Or as an object record:
const userRecord = Object.fromEntries(users.map((u) => [u.id, u]));
```
