import { useNavigate } from "react-router-dom";
import ActivityMultiStepForm from "../components/forms/ActivityMultiStepForm";

export default function NewActivityPage() {
    const navigate = useNavigate();

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate("/activities")} className="btn-ghost">
                    ← Back to Activities
                </button>
                <h2 className="text-white text-lg font-extrabold">New Activity</h2>
                <span className="bg-amber-400/10 text-amber-400 text-[10px] font-semibold px-2.5 py-0.5 rounded-md">
          Draft
        </span>
            </div>

            <ActivityMultiStepForm />
        </div>
    );
}
