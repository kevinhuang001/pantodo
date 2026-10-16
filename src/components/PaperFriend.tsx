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
        fill="#FFFDF4"
        stroke="#526A59"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M119 24L117 43L137 45"
        fill="#E1EDC8"
        stroke="#526A59"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M63 47L96 49M62 56L87 58" stroke="#D6DFCB" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="70" cy="82" rx="3" ry="4" fill="#526A59" />
      <ellipse cx="106" cy="84" rx="3" ry="4" fill="#526A59" />
      <path d="M82 88Q87 94 94 89" stroke="#526A59" strokeWidth="2.3" strokeLinecap="round" />
      <ellipse cx="59" cy="88" rx="6" ry="3.5" fill="#E9C594" opacity=".6" />
      <ellipse cx="117" cy="91" rx="6" ry="3.5" fill="#E9C594" opacity=".6" />
      <path
        d="M46 91Q28 88 26 77M132 92Q146 97 151 81M65 126L59 136M110 129L115 139"
        stroke="#526A59"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M145 68L156 49L163 53L152 73L145 78Z"
        fill="#E9BD62"
        stroke="#526A59"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M145 78L147 71L152 73Z" fill="#526A59" />
      <path
        d="M27 39L28 27M21 33L34 34M149 109L150 99M145 104L155 105"
        stroke="#ADC19B"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
