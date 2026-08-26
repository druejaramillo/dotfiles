; <script>...</script>
(script_element
  (script_element_text) @injection.content
  (#set! injection.language "javascript"))

; templ script Name(...) { ... }
(script_declaration
  (script_block
    (script_block_text) @injection.content)
  (#set! injection.language "javascript"))
