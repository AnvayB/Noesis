// Title, concept, and field for the detailed form. The concept and field are
// suggested by the model on submit when left blank, so nothing here waits
// on a network call while you type.
export function SessionTitleTopicFields({
  defaultTitle = "",
  defaultTopic = "",
  defaultField = "",
}: {
  defaultTitle?: string;
  defaultTopic?: string;
  defaultField?: string;
}) {
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="meta">What are you learning?</span>
        <input
          name="title"
          required
          autoFocus
          defaultValue={defaultTitle}
          placeholder="Attention, from scratch"
          className="field font-serif text-[22px] leading-snug"
          autoComplete="off"
        />
      </label>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="meta">Concept it belongs to</span>
          <input
            name="topic"
            defaultValue={defaultTopic}
            placeholder="Suggested if left blank"
            className="field"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="meta">Field</span>
          <input
            name="field"
            defaultValue={defaultField}
            placeholder="Machine learning, Baking…"
            className="field"
            autoComplete="off"
          />
        </label>
      </div>
      <p className="meta -mt-3">
        The concept is where this lands on your map; the field is the region it grows in. Both
        can be left for the model to suggest.
      </p>
    </>
  );
}
