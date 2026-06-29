import { useState } from "react";
import { aiTryOn } from "../api";

export default function TryOn() {
  const [person, setPerson] = useState(null);
  const [cloth, setCloth] = useState(null);
  const [result, setResult] = useState(null);

  const handleTryOn = async () => {
    const res = await aiTryOn(person, cloth);
    setResult(res.image);
  };

  return (
    <div>
      <h2>Virtual Try-On</h2>

      <input type="file" onChange={e => setPerson(e.target.files[0])} />
      <input type="file" onChange={e => setCloth(e.target.files[0])} />

      <button onClick={handleTryOn}>Try On</button>

      {result && <img src={result} alt="result" />}
    </div>
  );
}