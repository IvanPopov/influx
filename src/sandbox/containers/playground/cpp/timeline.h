#pragma once

#include <chrono>
#include <string>
#include <map>

struct TIMELINE
{
    using ms = std::chrono::milliseconds;

    std::map<std::string, float> m_constants;

    ms      m_startTime;
    ms      m_elapsedTimeLevel;
    bool    m_active;

    TIMELINE();

    void tick();
    bool isStopped() const;
    void start();
    void stop();
};
