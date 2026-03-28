from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    frontend_origin: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173"

    gemini_api_key: str = ""
    # Must support Live / BidiGenerateContent (see Gemini API “Live” / native audio models).
    gemini_live_model: str = "gemini-3.1-flash-live-preview"
    # Still-image form markup (Nano Banana 2); REST generateContent, not Live WebSocket.
    gemini_image_model: str = "gemini-3.1-flash-image-preview"

    # Background removal after image gen: local rembg (default) or remove.bg API
    # rembg | remove_bg
    background_removal_provider: str = "rembg"

    # remove.bg — only when BACKGROUND_REMOVAL_PROVIDER=remove_bg
    # https://www.remove.bg/api
    remove_bg_api_key: str = ""

    # rembg quality (pixel art / sprites): crisper edges, less “washed out” halos
    rembg_post_process_mask: bool = True
    # 1–255: snap alpha to fully opaque/transparent; 0 = leave rembg’s soft alpha
    rembg_alpha_threshold: int = 200

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
