from types import SimpleNamespace

from ingredient_detection.adapters.openai_vision import OpenAIVisionModel
from ingredient_detection.models.frames import Frame, FrameWindow


class FakeResponses:
    def __init__(self):
        self.request = None

    def create(self, **kwargs):
        self.request = kwargs
        return SimpleNamespace(
            output_text=(
                '{"ingredient":"salt","quantity":0.5,"unit":"teaspoon",'
                '"addition_confirmed":true,"timestamp":2.5,"evidence_frame_index":1}'
            )
        )


def test_openai_adapter_maps_structured_result_and_evidence():
    responses = FakeResponses()
    adapter = OpenAIVisionModel.__new__(OpenAIVisionModel)
    adapter._client = SimpleNamespace(responses=responses)
    adapter._model = "gpt-4.1-mini"
    window = FrameWindow(
        window_id=0,
        timestamp_start=0,
        timestamp_end=4,
        frames=[
            Frame(timestamp=2, jpeg_bytes=b"first"),
            Frame(timestamp=2.5, jpeg_bytes=b"best"),
        ],
    )

    observation = adapter.analyze(window)

    assert observation.timestamp == 2.5
    assert observation.evidence_timestamp == 2.5
    assert observation.evidence_jpeg == b"best"
    assert responses.request["text"]["format"]["type"] == "json_schema"
    assert len(responses.request["input"][0]["content"]) == 3
