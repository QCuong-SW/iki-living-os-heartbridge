export function Scene({
  variant = "dinner",
}: {
  variant?: "dinner" | "dalat" | "breakfast";
}) {
  if (variant === "dalat")
    return (
      <svg
        className="scene"
        viewBox="0 0 600 330"
        role="img"
        aria-label="Minh họa chuyến đi Đà Lạt của gia đình"
      >
        <rect width="600" height="330" fill="#dfe6d8" />
        <circle cx="465" cy="72" r="37" fill="#f3c28d" />
        <path d="M0 240 125 77 263 238 380 116 600 254V330H0" fill="#809b85" />
        <path d="m0 300 194-128 162 89 133-78 111 85v62H0" fill="#537461" />
        <path d="M190 330 290 212 384 330" fill="#ddc39d" />
        {[210, 268, 332, 388].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy={205 + (i % 2) * 10} r="15" fill="#e9b692" />
            <path
              d={`M${x - 20} 275v-37q20-30 40 0v37`}
              fill={["#ad6957", "#e3b873", "#f4e4c8", "#577679"][i]}
            />
          </g>
        ))}
      </svg>
    );
  return (
    <svg
      className="scene"
      viewBox="0 0 600 330"
      role="img"
      aria-label="Minh họa cả nhà quây quần bên bàn ăn"
    >
      <rect
        width="600"
        height="330"
        fill={variant === "breakfast" ? "#f1e7cd" : "#ecdfcc"}
      />
      <rect x="220" y="22" width="160" height="137" rx="75" fill="#f8f0dc" />
      <path d="M300 25v132M223 99h154" stroke="#d1c0a1" strokeWidth="5" />
      <circle cx="339" cy="69" r="24" fill="#e7b56a" />
      <path d="M230 156q30-64 66 0 34-84 77 0" fill="#b0b69a" />
      <path
        d="M59 221v-93m0 54q-52-38-26-62 34 13 26 62m0-9q38-63 63-28-4 30-63 40"
        stroke="#737e58"
        strokeWidth="7"
        fill="#8c9567"
      />
      <path d="M35 210h49l-8 60H45Z" fill="#be8b67" />
      <path
        d="M512 221v-93m0 54q-39-47-13-62 23 15 13 62m0-9q36-63 53-28-4 30-53 40"
        stroke="#737e58"
        strokeWidth="7"
        fill="#8c9567"
      />
      <path d="M492 210h40l-5 60h-30Z" fill="#b99372" />
      <path d="M300 0v37" stroke="#7e624d" strokeWidth="3" />
      <path d="M260 47q40-43 80 0Z" fill="#c18b54" />
      <g>
        <path d="M137 235v-51q29-45 59 0v54" fill="#a1a58e" />
        <ellipse cx="166" cy="146" rx="25" ry="31" fill="#dcb18d" />
        <path
          d="M143 143q-16-52 29-44 35 8 17 53l-7-29q-20 13-36 6Z"
          fill="#c9c2b5"
        />
        <circle cx="170" cy="103" r="17" fill="#c9c2b5" />
      </g>
      <g>
        <path d="M220 223v-62q31-44 61 0v66" fill="#b17555" />
        <ellipse cx="252" cy="123" rx="24" ry="30" fill="#c98e6b" />
        <path
          d="M228 119q-10-39 24-36 37 0 23 41l-7-25-39 10Z"
          fill="#493b31"
        />
      </g>
      <g>
        <path d="M337 226v-62q29-42 59 0v65" fill="#e1b169" />
        <path d="M340 156q-9-64 25-65 38 1 31 65Z" fill="#504536" />
        <ellipse cx="366" cy="128" rx="23" ry="28" fill="#e5b590" />
        <path d="M343 122q7-43 43-21l5 21q-26-5-32-21Z" fill="#504536" />
      </g>
      <g>
        <path d="M422 253v-63q29-40 58 0v63" fill="#758d89" />
        <ellipse cx="452" cy="155" rx="25" ry="29" fill="#e0ac83" />
        <path d="M429 154q-19-39 16-42 38-2 31 42l-7-24-40 6Z" fill="#493b31" />
      </g>
      <ellipse cx="303" cy="264" rx="203" ry="51" fill="#ae7c52" />
      <ellipse cx="303" cy="253" rx="203" ry="47" fill="#d0a579" />
      {[177, 257, 350, 434].map((x, i) => (
        <g key={x}>
          <ellipse
            cx={x}
            cy={244 + (i % 2) * 24}
            rx="24"
            ry="10"
            fill="#f7eedb"
          />
          <ellipse
            cx={x}
            cy={242 + (i % 2) * 24}
            rx="15"
            ry="6"
            fill="#d4b77f"
          />
        </g>
      ))}
      <ellipse cx="300" cy="244" rx="31" ry="13" fill="#718258" />
      <path d="M278 237q22-21 44 0" fill="#94a173" />
      <path d="m204 256 18-22m163 43 17-22" stroke="#745038" strokeWidth="3" />
    </svg>
  );
}
