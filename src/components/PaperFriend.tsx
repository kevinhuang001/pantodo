/** Small code-native paper mascot, shared by the desk and page headings. */
export function PaperFriend({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? 'paper-friend small' : 'paper-friend'}
      viewBox="0 0 180 150"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="87" cy="137" rx="50" ry="7" fill="currentColor" opacity=".07" />
      <path
        d="M48 29Q48 19 59 20L119 24L137 45L131 119Q130 130 119 129L53 124Q42 123 43 112Z"
        fill="var(--surface-strong)"
        stroke="var(--accent-strong)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M119 24L117 43L137 45"
        fill="var(--accent-soft)"
        stroke="var(--accent-strong)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M63 47L96 49M62 56L87 58"
        stroke="var(--border-strong)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="70" cy="82" rx="3" ry="4" fill="var(--accent-strong)" />
      <ellipse cx="106" cy="84" rx="3" ry="4" fill="var(--accent-strong)" />
      <path
        d="M82 88Q87 94 94 89"
        stroke="var(--accent-strong)"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <ellipse cx="59" cy="88" rx="6" ry="3.5" fill="var(--accent)" opacity=".6" />
      <ellipse cx="117" cy="91" rx="6" ry="3.5" fill="var(--accent)" opacity=".6" />
      <path
        d="M46 91Q28 88 26 77M132 92Q146 97 151 81M65 126L59 136M110 129L115 139"
        stroke="var(--accent-strong)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M145 68L156 49L163 53L152 73L145 78Z"
        fill="var(--accent)"
        stroke="var(--accent-strong)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M145 78L147 71L152 73Z" fill="var(--accent-strong)" />
      <path
        d="M27 39L28 27M21 33L34 34M149 109L150 99M145 104L155 105"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
