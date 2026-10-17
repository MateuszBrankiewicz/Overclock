using Ardalis.Result;

namespace Overclock.SharedKernel;

public static class ResultExtensions
{
    public static Result<TDestination> ToResult<TDestination>(this IResult source)
    {
        return source.Status switch
        {
            ResultStatus.Ok => Result<TDestination>.Success(default!),
            ResultStatus.NotFound => Result<TDestination>.NotFound([.. source.Errors]),
            ResultStatus.Unauthorized => Result<TDestination>.Unauthorized([.. source.Errors]),
            ResultStatus.Forbidden => Result<TDestination>.Forbidden([.. source.Errors]),
            ResultStatus.Invalid => Result<TDestination>.Invalid(source.ValidationErrors),
            ResultStatus.Error => Result<TDestination>.Error(new ErrorList([.. source.Errors])),
            ResultStatus.Conflict => Result<TDestination>.Conflict([.. source.Errors]),
            ResultStatus.CriticalError => Result<TDestination>.CriticalError([.. source.Errors]),
            ResultStatus.Unavailable => Result<TDestination>.Unavailable([.. source.Errors]),
            _ => Result<TDestination>.Error(new ErrorList([.. source.Errors]))
        };
    }

    public static Result ToResult(this IResult source)
    {
        return source.Status switch
        {
            ResultStatus.Ok => Result.Success(),
            ResultStatus.NotFound => Result.NotFound([.. source.Errors]),
            ResultStatus.Unauthorized => Result.Unauthorized([.. source.Errors]),
            ResultStatus.Forbidden => Result.Forbidden([.. source.Errors]),
            ResultStatus.Invalid => Result.Invalid(source.ValidationErrors),
            ResultStatus.Error => Result.Error(new ErrorList([.. source.Errors])),
            ResultStatus.Conflict => Result.Conflict([.. source.Errors]),
            ResultStatus.CriticalError => Result.CriticalError([.. source.Errors]),
            ResultStatus.Unavailable => Result.Unavailable([.. source.Errors]),
            _ => Result.Error(new ErrorList([.. source.Errors]))
        };
    }
}
