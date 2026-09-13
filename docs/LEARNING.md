# Learning Map

This project is intended to teach practical full-stack concepts while building a real product.

Keep explanations short and connected to the task being implemented.

## 1. JavaScript vs TypeScript

Learn:
- static type checking
- inference
- interfaces/types
- safer refactoring

Interview answer:
TypeScript adds static typing on top of JavaScript, which helps catch many errors earlier and makes larger codebases easier to maintain.

## 2. interface vs type

Learn:
- object contracts
- unions
- intersections
- when each is convenient

Do not turn this into a style war. Use the project's conventions consistently.

## 3. Vue Reactivity

Learn:
- ref
- reactive
- computed
- watch
- component props/events

Understand how UI updates when state changes.

## 4. Props vs State

In Vue:
- props are inputs from parent to child
- local state belongs to the component

Do not confuse shared application state with every local UI value.

## 5. Pinia

Use selectively.

Learn:
- why global state exists
- why not everything belongs globally
- store actions/getters/state

## 6. Nuxt

Learn:
- pages
- layouts
- components
- composables
- server routes
- SSR/CSR basics
- middleware

## 7. HTTP Request Lifecycle

Understand:

Browser
→ DNS
→ connection
→ HTTP request
→ server
→ middleware
→ validation
→ business logic
→ database/cache
→ HTTP response
→ browser

Explain only the relevant depth when implementing APIs.

## 8. HTTP vs HTTPS

HTTPS is HTTP protected by TLS.

It provides encryption in transit and helps authenticate the server, protecting against many network interception attacks.

## 9. Status Codes

Important:
- 200 success
- 201 created
- 400 bad request
- 401 unauthenticated
- 403 forbidden
- 404 not found
- 409 conflict
- 429 rate limited
- 500 server error

Key distinction:
401 = identity/authentication is missing or invalid.
403 = identity is known but access is not allowed.

## 10. Authentication vs Authorization

Authentication:
Who are you?

Authorization:
What are you allowed to access/do?

## 11. HTTP-only Cookies

Learn:
- cookie sent by browser
- HttpOnly prevents normal JavaScript access
- Secure for HTTPS environments
- SameSite behavior
- why cookie-based auth needs CSRF considerations depending on architecture

Do not store auth tokens in localStorage for this project.

## 12. CORS

CORS is a browser security mechanism controlling whether a web page can make certain cross-origin requests.

It is NOT an authentication system.

Only configure it when the architecture requires it.

## 13. API Security

Learn:
- server-side validation
- authorization
- rate limiting
- secure cookies
- safe error messages
- ownership checks
- avoiding trust in client-calculated values

## 14. MongoDB

Learn:
- documents
- collections
- queries
- indexes
- modeling
- atomic operations
- transactions only when justified

Scalability discussion should be practical, not "MongoDB is always faster."

## 15. Redis

Learn:
- in-memory data store
- caching
- counters
- TTL
- rate limiting
- cache invalidation
- failure/fallback

Key principle:
MongoDB = business truth
Redis = temporary acceleration/security state

## 16. Cache

Learn:
Request
→ cache lookup
→ HIT: return cached result
→ MISS: calculate/load source data
→ store result
→ return

Understand stale data and invalidation.

## 17. TTL

Time To Live determines how long cached data remains valid.

Availability cache should use a short TTL because appointments can change.

## 18. Rate Limiting

Learn:
- why APIs need abuse protection
- fixed window/sliding window concepts
- Redis counters
- 429 response

## 19. Event Loop

Learn when implementing asynchronous server/database work:
- JavaScript execution model
- call stack
- async I/O
- event loop
- callbacks/promises

## 20. async/await

Learn:
- Promise-based abstraction
- await pauses the async function's continuation, not the whole JavaScript process
- errors with try/catch
- concurrency with Promise.all where appropriate

## 21. Race Conditions / Double Booking

Critical project concept.

Two customers can request the same slot nearly simultaneously.

Frontend checks are not enough.

The server/database must perform a safe final check and creation strategy.

This is one of the best interview topics in the project.

## 22. CPU vs GPU

Only teach when naturally relevant.

CPU is optimized for general-purpose sequential/control-heavy workloads.
GPU has many parallel processing units suited to highly parallel workloads.

Do not add GPU-related infrastructure to this project.

## 23. Docker

Docker is intentionally NOT used in the project.

If the concept is discussed:
- image = packaged immutable template
- container = running instance of an image

Do not create Dockerfiles or compose files.

## 24. DNS

When discussing how a public booking URL works:
domain
→ DNS resolution
→ server/network destination
→ HTTPS connection
→ HTTP request

Keep the explanation practical.

## 25. Interview Practice Rule

For important concepts, be able to answer:

1. What is it?
2. Why did we use it here?
3. What problem does it solve?
4. What alternative exists?
5. What can go wrong?

The goal is understanding, not memorization.
