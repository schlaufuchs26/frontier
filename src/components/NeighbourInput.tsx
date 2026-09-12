import { useCallback, useRef, useState } from "react";
import { searchCountries } from "../game/search";
import type { Country } from "../game/types";

interface Props {
  /** Ids that cannot be picked: the round's target and names already chosen. */
  exclude: string[];
  onPick: (id: string) => void;
}

/**
 * Recall input for one round: type a name, pick it from the short list below.
 * The target and already-named countries are filtered out, so the same name
 * cannot be added twice. Enter takes the highlighted entry, Escape clears the
 * field; the arrow keys walk the list.
 */
export function NeighbourInput({ exclude, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = searchCountries(query, { exclude });
  const highlighted = Math.min(active, Math.max(matches.length - 1, 0));
  const current = matches[highlighted];

  const choose = useCallback(
    (country: Country) => {
      onPick(country.id);
      setQuery("");
      setActive(0);
      inputRef.current?.focus();
    },
    [onPick],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && matches.length > 0) {
      event.preventDefault();
      setActive((highlighted + 1) % matches.length);
      return;
    }
    if (event.key === "ArrowUp" && matches.length > 0) {
      event.preventDefault();
      setActive((highlighted - 1 + matches.length) % matches.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (current) choose(current);
      return;
    }
    if (event.key === "Escape") {
      setQuery("");
      setActive(0);
    }
  };

  return (
    <div className="guesser">
      <input
        ref={inputRef}
        type="text"
        className="guess"
        data-testid="guess-input"
        placeholder="Type a country name"
        aria-label="Country name"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      {matches.length > 0 ? (
        <ul
          className="suggestions"
          aria-label="Country suggestions"
          data-testid="suggestions"
        >
          {matches.map((country, index) => (
            <li key={country.id}>
              <button
                type="button"
                id={`suggestion-${country.id}`}
                data-testid={`suggestion-${country.id}`}
                className={index === highlighted ? "active" : ""}
                onClick={() => choose(country)}
              >
                {country.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {query.trim() !== "" && matches.length === 0 ? (
        <p className="no-match" data-testid="no-match">
          Nothing to add for that name.
        </p>
      ) : null}
    </div>
  );
}
